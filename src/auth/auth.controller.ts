import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  Session,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, TelegramUser } from './auth.service';
import { ConfigService } from '@nestjs/config';

declare module 'express-session' {
  interface SessionData {
    state: string;
    codeVerifier: string;
    nonce: string;
    user: TelegramUser;
  }
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /auth/login
   * Initiates the Telegram OIDC login flow
   */
  @Get('login')
  login(@Session() session: Record<string, any>, @Res() res: Response) {
    const state = this.authService.generateState();
    const nonce = this.authService.generateNonce();
    const codeVerifier = this.authService.generateCodeVerifier();
    const codeChallenge = this.authService.generateCodeChallenge(codeVerifier);

    // Save to session for later verification
    session.state = state;
    session.nonce = nonce;
    session.codeVerifier = codeVerifier;

    const authUrl = this.authService.buildAuthUrl({
      state,
      codeChallenge,
      nonce,
    });

    return res.redirect(authUrl);
  }

  /**
   * GET /auth/callback
   * Handles Telegram's redirect after user authorization
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('appUrl');

    // Handle user denial
    if (error) {
      return res.redirect(`${appUrl}/?error=${encodeURIComponent(error)}`);
    }

    // Validate state (CSRF protection)
    if (!state || state !== session.state) {
      throw new UnauthorizedException('Invalid state parameter (CSRF check failed)');
    }

    if (!code) {
      throw new UnauthorizedException('Missing authorization code');
    }

    const codeVerifier = session.codeVerifier;

    // Clear PKCE session data
    delete session.state;
    delete session.codeVerifier;
    delete session.nonce;

    // Exchange code for tokens
    const tokens = await this.authService.exchangeCodeForTokens({
      code,
      codeVerifier,
    });

    // Validate and decode id_token
    const user = await this.authService.validateIdToken(tokens.id_token);

    // Save user to session
    session.user = user;

    return res.redirect(`${appUrl}/?login=success`);
  }

  /**
   * GET /auth/me
   * Returns the currently authenticated user
   */
  @Get('me')
  me(@Session() session: Record<string, any>) {
    if (!session.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    return {
      success: true,
      user: {
        id: session.user.id || session.user.sub,
        name: session.user.name,
        username: session.user.preferred_username,
        picture: session.user.picture,
        phone: session.user.phone_number,
      },
    };
  }

  /**
   * GET /auth/logout
   * Destroys the session and logs the user out
   */
  @Get('logout')
  logout(
    @Session() session: Record<string, any>,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('appUrl');
    session.destroy(() => {
      res.redirect(`${appUrl}/?logout=success`);
    });
  }
}
