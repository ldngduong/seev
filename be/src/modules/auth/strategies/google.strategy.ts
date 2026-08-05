import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

import type { Env } from '../../../config/env.schema';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    configService: ConfigService<Env, true>,
    private readonly authService: AuthService,
  ) {
    super({
      clientID:
        configService.get('GOOGLE_CLIENT_ID', { infer: true }) ||
        'google-client-id-not-configured',
      clientSecret:
        configService.get('GOOGLE_CLIENT_SECRET', { infer: true }) ||
        'google-client-secret-not-configured',
      callbackURL: configService.get('GOOGLE_CALLBACK_URL', { infer: true }),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    try {
      const user = await this.authService.validateGoogleProfile(profile);

      done(null, user);
    } catch (error) {
      done(error, false);
    }
  }
}
