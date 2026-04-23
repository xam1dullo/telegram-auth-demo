import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, TelegramUser } from './auth.service';
import { ConfigService } from '@nestjs/config';

interface AuthSession {
  state?: string;
  codeVerifier?: string;
  nonce?: string;
  user?: TelegramUser;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  login(@Req() req: Request, @Res() res: Response) {
    const state = this.authService.generateState();
    const nonce = this.authService.generateNonce();
    const codeVerifier = this.authService.generateCodeVerifier();
    const codeChallenge = this.authService.generateCodeChallenge(codeVerifier);

    const session = req.session as AuthSession;
    session.state = state;
    session.nonce = nonce;
    session.codeVerifier = codeVerifier;

    return res.redirect(
      this.authService.buildAuthUrl({ state, codeChallenge, nonce }),
    );
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const appUrl = this.configService.get<string>('appUrl');
    const session = req.session as AuthSession;

    if (error) {
      return res.redirect(`${appUrl}/?error=${encodeURIComponent(error)}`);
    }

    if (!state || state !== session.state) {
      return res.redirect(`${appUrl}/?error=invalid_state`);
    }

    if (!code) {
      return res.redirect(`${appUrl}/?error=missing_code`);
    }

    const { codeVerifier, nonce } = session;
    if (!codeVerifier || !nonce) {
      return res.redirect(`${appUrl}/?error=session_expired`);
    }

    session.state = undefined;
    session.codeVerifier = undefined;
    session.nonce = undefined;

    try {
      const tokens = await this.authService.exchangeCodeForTokens({
        code,
        codeVerifier,
      });
      const user = await this.authService.validateIdToken(tokens.id_token, nonce);
      session.user = user;
      return res.redirect(`${appUrl}/?login=success`);
    } catch (e) {
      return res.redirect(`${appUrl}/?error=${encodeURIComponent(e.message)}`);
    }
  }

  @Get('me')
  me(@Req() req: Request) {
    const session = req.session as AuthSession;
    if (!session.user) {
      throw new UnauthorizedException('Not authenticated');
    }
    const u = session.user;
    return {
      success: true,
      user: {
        sub: u.sub,
        id: u.id ?? u.sub,
        name: u.name,
        username: u.preferred_username,
        picture: u.picture,
        phone: u.phone_number,
      },
    };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const appUrl = this.configService.get<string>('appUrl');
    (req as any).session = null;
    return res.redirect(`${appUrl}/?logout=success`);
  }
}
