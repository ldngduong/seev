import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { Env } from '../../../config/env.schema';
import { AuthService } from '../auth.service';
import type { JwtPayload } from '../types/jwt-payload.type';

function extractJwtFromCookie(cookieName: string) {
  return (request: Request) => {
    const cookies = request.cookies as Record<string, string> | undefined;

    return cookies?.[cookieName] ?? null;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<Env, true>,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie(
          configService.get('AUTH_COOKIE_NAME', { infer: true }),
        ),
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET', { infer: true }),
    });
  }

  validate(payload: JwtPayload) {
    return this.authService.validateJwtPayload(payload);
  }
}
