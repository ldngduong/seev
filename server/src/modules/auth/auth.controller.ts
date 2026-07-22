import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';

import type { Env } from '../../config/env.schema';
import { toPublicUser } from '../users/types/public-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { AuthenticatedRequest } from './types/authenticated-request.type';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const session = await this.authService.register(dto);

    this.setAuthCookie(res, session.accessToken);

    return { user: session.user };
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(
    @Body() _dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = this.authService.createSession(req.user);

    this.setAuthCookie(res, session.accessToken);

    return { user: session.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return { user: toPublicUser(req.user) };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.authService.getCookieName(), this.getCookieOptions());

    return { ok: true };
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  google() {
    return;
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  googleCallback(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: false }) res: Response,
  ) {
    const session = this.authService.createSession(req.user);

    this.setAuthCookie(res, session.accessToken);
    res.redirect(
      this.configService.get('GOOGLE_SUCCESS_REDIRECT_URL', { infer: true }),
    );
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(this.authService.getCookieName(), token, this.getCookieOptions());
  }

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        this.configService.get('NODE_ENV', { infer: true }) === 'production',
      maxAge: this.authService.getCookieMaxAgeMs(),
      path: '/',
    };
  }
}
