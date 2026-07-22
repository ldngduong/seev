import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { Profile } from 'passport-google-oauth20';

import type { Env } from '../../config/env.schema';
import { User } from '../users/entities/user.entity';
import { toPublicUser } from '../users/types/public-user.type';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto) {
    const password = await hash(dto.password, 12);
    const user = await this.usersService.create({
      ...dto,
      password,
    });

    return this.createSession(user);
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
    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid authentication token.');
    }

    return user;
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

  createSession(user: User) {
    return {
      user: toPublicUser(user),
      accessToken: this.signAccessToken(user),
    };
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

  assertGoogleConfigured() {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID', { infer: true });
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
    };

    return this.jwtService.sign(payload);
  }
}
