import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';

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
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.register(
      dto,
      this.getSessionMetadata(req),
    );

    this.setSessionCookies(res, session);

    return { user: session.user };
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() _dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.createSession(
      req.user,
      this.getSessionMetadata(req),
    );

    this.setSessionCookies(res, session);

    return { user: session.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return { user: toPublicUser(req.user) };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.getRefreshToken(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const session = await this.authService.refresh(
      refreshToken,
      this.getSessionMetadata(req),
    );
    this.setSessionCookies(res, session);

    return { user: session.user };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.revokeRefreshToken(this.getRefreshToken(req));
    this.clearSessionCookies(res);

    return { ok: true };
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  google() {
    return;
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: false }) res: Response,
  ) {
    const session = await this.authService.createSession(
      req.user,
      this.getSessionMetadata(req),
    );

    this.setSessionCookies(res, session);
    res.redirect(
      this.configService.get('GOOGLE_SUCCESS_REDIRECT_URL', { infer: true }),
    );
  }

  private setSessionCookies(
    res: Response,
    session: { accessToken: string; refreshToken: string },
  ) {
    res.cookie(
      this.authService.getCookieName(),
      session.accessToken,
      this.getAccessCookieOptions(),
    );
    res.cookie(
      this.authService.getRefreshCookieName(),
      session.refreshToken,
      this.getRefreshCookieOptions(),
    );
  }

  private clearSessionCookies(res: Response) {
    res.clearCookie(this.authService.getCookieName(), {
      ...this.getBaseCookieOptions(),
      path: '/',
    });
    res.clearCookie(this.authService.getRefreshCookieName(), {
      ...this.getBaseCookieOptions(),
      path: '/auth',
    });
  }

  private getAccessCookieOptions(): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      maxAge: this.authService.getCookieMaxAgeMs(),
      path: '/',
    };
  }

  private getRefreshCookieOptions(): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      maxAge: this.authService.getRefreshCookieMaxAgeMs(),
      path: '/auth',
    };
  }

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure:
        this.configService.get('NODE_ENV', { infer: true }) === 'production',
    };
  }

  private getRefreshToken(req: Request) {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[this.authService.getRefreshCookieName()];
  }

  private getSessionMetadata(req: Request) {
    return {
      ipAddress: req.ip || null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
