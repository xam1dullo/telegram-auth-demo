import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface TelegramUser {
  sub: string;
  id: number;
  name: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly TELEGRAM_AUTH_URL = 'https://oauth.telegram.org/auth';
  private readonly TELEGRAM_TOKEN_URL = 'https://oauth.telegram.org/token';
  private readonly TELEGRAM_JWKS_URL =
    'https://oauth.telegram.org/.well-known/jwks.json';

  private readonly jwks = createRemoteJWKSet(
    new URL(this.TELEGRAM_JWKS_URL),
  );

  constructor(private configService: ConfigService) {}

  /**
   * PKCE: Generate code_verifier (random 64 bytes, base64url encoded)
   */
  generateCodeVerifier(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  /**
   * PKCE: Generate code_challenge from code_verifier (SHA256 + base64url)
   */
  generateCodeChallenge(codeVerifier: string): string {
    return crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');
  }

  /**
   * Generate random state string for CSRF protection
   */
  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate nonce for replay attack protection
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Build the Telegram OIDC authorization URL
   */
  buildAuthUrl(params: {
    state: string;
    codeChallenge: string;
    nonce?: string;
  }): string {
    const clientId = this.configService.get<string>('telegram.clientId');
    const appUrl = this.configService.get<string>('appUrl');
    const redirectUri = `${appUrl}/auth/callback`;

    const searchParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile',
      state: params.state,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    });

    if (params.nonce) {
      searchParams.append('nonce', params.nonce);
    }

    return `${this.TELEGRAM_AUTH_URL}?${searchParams.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(params: {
    code: string;
    codeVerifier: string;
  }): Promise<{ access_token: string; id_token: string; expires_in: number }> {
    const clientId = this.configService.get<string>('telegram.clientId');
    const clientSecret = this.configService.get<string>(
      'telegram.clientSecret',
    );
    const appUrl = this.configService.get<string>('appUrl');
    const redirectUri = `${appUrl}/auth/callback`;

    // Basic Auth: base64(client_id:client_secret)
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64',
    );

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: params.codeVerifier,
    });

    const response = await axios.post(this.TELEGRAM_TOKEN_URL, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
    });

    return response.data;
  }

  /**
   * Validate and decode the id_token JWT
   */
  async validateIdToken(idToken: string): Promise<TelegramUser> {
    const clientId = this.configService.get<string>('telegram.clientId');

    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: 'https://oauth.telegram.org',
        audience: clientId,
      });

      return payload as unknown as TelegramUser;
    } catch (error) {
      throw new UnauthorizedException('Invalid id_token: ' + error.message);
    }
  }
}
