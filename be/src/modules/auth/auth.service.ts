import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type { Profile } from 'passport-google-oauth20';
import { DataSource, IsNull, Repository } from 'typeorm';

import type { Env } from '../../config/env.schema';
import { User } from '../users/entities/user.entity';
import { toPublicUser } from '../users/types/public-user.type';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshSession } from './entities/refresh-session.entity';
import type { AuthSessionMetadata } from './types/auth-session-metadata.type';
import type { JwtPayload, RefreshJwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepository: Repository<RefreshSession>,
  ) {}

  async register(dto: RegisterDto, metadata: AuthSessionMetadata) {
    const password = await hash(dto.password, 12);
    const user = await this.usersService.create({
      ...dto,
      password,
    });

    return this.createSession(user, metadata);
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user?.password) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await compare(password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return user;
  }

  async validateJwtPayload(payload: JwtPayload) {
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    return user;
  }

  async verifyAccessToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET', { infer: true }),
        issuer: this.configService.get('JWT_ISSUER', { infer: true }),
        audience: this.configService.get('JWT_AUDIENCE', { infer: true }),
      });
      return this.validateJwtPayload(payload);
    } catch {
      throw new UnauthorizedException('Invalid authentication token.');
    }
  }

  async validateGoogleProfile(profile: Profile) {
    const googleId = profile.id;
    const email = profile.emails?.[0]?.value;

    if (!googleId || !email) {
      throw new UnauthorizedException('Google account did not provide email.');
    }

    const existingByGoogleId = await this.usersService.findByGoogleId(googleId);

    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    const existingByEmail = await this.usersService.findByEmail(email);
    const avatar = profile.photos?.[0]?.value ?? null;
    const fullName =
      profile.displayName ||
      [profile.name?.givenName, profile.name?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      email;

    if (existingByEmail) {
      return this.usersService.update(existingByEmail, {
        googleId,
        avatar: existingByEmail.avatar ?? avatar,
        fullName: existingByEmail.fullName || fullName,
      });
    }

    return this.usersService.create({
      email,
      fullName,
      username: await this.usersService.generateAvailableUsername(
        email,
        profile.displayName,
      ),
      avatar,
      googleId,
    });
  }

  async createSession(user: User, metadata: AuthSessionMetadata) {
    const familyId = randomUUID();
    const refreshSession = this.createRefreshSession(
      user.id,
      familyId,
      metadata,
    );
    const refreshToken = await this.signRefreshToken(refreshSession);
    refreshSession.tokenHash = this.hashToken(refreshToken);
    await this.refreshSessionRepository.save(refreshSession);

    return {
      user: toPublicUser(user),
      accessToken: this.signAccessToken(user),
      refreshToken,
    };
  }

  async refresh(refreshToken: string, metadata: AuthSessionMetadata) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const result = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RefreshSession);
      const current = await repository.findOne({
        where: { id: payload.sid },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        !current ||
        current.userId !== payload.sub ||
        current.familyId !== payload.familyId
      ) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const presentedHash = this.hashToken(refreshToken);
      const hashMatches = this.constantTimeEqual(
        presentedHash,
        current.tokenHash,
      );

      if (current.revokedAt || !hashMatches) {
        await repository.update(
          { familyId: current.familyId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
        return { status: 'reuse-detected' as const };
      }

      if (current.expiresAt.getTime() <= Date.now()) {
        current.revokedAt = new Date();
        await repository.save(current);
        return { status: 'expired' as const };
      }

      const user = await manager.getRepository(User).findOneBy({
        id: current.userId,
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token.');
      }

      const replacement = this.createRefreshSession(
        current.userId,
        current.familyId,
        metadata,
      );
      const nextRefreshToken = await this.signRefreshToken(replacement);
      replacement.tokenHash = this.hashToken(nextRefreshToken);

      current.revokedAt = new Date();
      current.lastUsedAt = new Date();
      current.replacedBySessionId = replacement.id;

      await repository.save(replacement);
      await repository.save(current);

      return {
        status: 'rotated' as const,
        user: toPublicUser(user),
        accessToken: this.signAccessToken(user),
        refreshToken: nextRefreshToken,
      };
    });

    if (result.status === 'reuse-detected') {
      throw new UnauthorizedException(
        'Refresh token reuse detected. Please sign in again.',
      );
    }

    if (result.status === 'expired') {
      throw new UnauthorizedException('Refresh token has expired.');
    }

    return result;
  }

  async revokeRefreshToken(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    let payload: RefreshJwtPayload;

    try {
      payload = await this.verifyRefreshToken(refreshToken, true);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return;
      }

      throw error;
    }

    await this.refreshSessionRepository.update(
      { id: payload.sid, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  getCookieName() {
    return this.configService.get('AUTH_COOKIE_NAME', { infer: true });
  }

  getCookieMaxAgeMs() {
    return (
      this.configService.get('AUTH_COOKIE_MAX_AGE_SECONDS', { infer: true }) *
      1000
    );
  }

  getRefreshCookieName() {
    return this.configService.get('REFRESH_COOKIE_NAME', { infer: true });
  }

  getRefreshCookieMaxAgeMs() {
    return (
      this.configService.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) *
      1000
    );
  }

  assertGoogleConfigured() {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID', {
      infer: true,
    });
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET', {
      infer: true,
    });

    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured on the backend.',
      );
    }
  }

  private signAccessToken(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tokenType: 'access',
    };

    return this.jwtService.sign(payload);
  }

  private createRefreshSession(
    userId: string,
    familyId: string,
    metadata: AuthSessionMetadata,
  ) {
    return this.refreshSessionRepository.create({
      id: randomUUID(),
      userId,
      familyId,
      tokenHash: '',
      expiresAt: new Date(Date.now() + this.getRefreshCookieMaxAgeMs()),
      revokedAt: null,
      replacedBySessionId: null,
      lastUsedAt: null,
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
    });
  }

  private signRefreshToken(session: RefreshSession) {
    const payload: RefreshJwtPayload = {
      sub: session.userId,
      sid: session.id,
      familyId: session.familyId,
      tokenType: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET', { infer: true }),
      expiresIn: this.configService.get('REFRESH_TOKEN_TTL_SECONDS', {
        infer: true,
      }),
      issuer: this.configService.get('JWT_ISSUER', { infer: true }),
      audience: this.configService.get('JWT_AUDIENCE', { infer: true }),
    });
  }

  private async verifyRefreshToken(token: string, ignoreExpiration = false) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        token,
        {
          secret: this.configService.get('REFRESH_TOKEN_SECRET', {
            infer: true,
          }),
          issuer: this.configService.get('JWT_ISSUER', { infer: true }),
          audience: this.configService.get('JWT_AUDIENCE', { infer: true }),
          ignoreExpiration,
        },
      );

      if (
        payload.tokenType !== 'refresh' ||
        !payload.sid ||
        !payload.familyId
      ) {
        throw new Error('Unexpected token type.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private constantTimeEqual(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
