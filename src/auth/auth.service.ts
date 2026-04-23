import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface TelegramUser {
  sub: string;
  id?: number;
  name?: string;
  preferred_username?: string;
  picture?: string;
  phone_number?: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  nonce?: string;
}

@Injectable()
export class AuthService {
  private readonly TELEGRAM_ISSUER = 'https://oauth.telegram.org';
  private readonly TELEGRAM_AUTH_URL = `${this.TELEGRAM_ISSUER}/auth`;
  private readonly TELEGRAM_TOKEN_URL = `${this.TELEGRAM_ISSUER}/token`;
  private readonly TELEGRAM_JWKS_URL = `${this.TELEGRAM_ISSUER}/.well-known/jwks.json`;

  private readonly jwks = createRemoteJWKSet(new URL(this.TELEGRAM_JWKS_URL));

  constructor(private configService: ConfigService) {}

  generateCodeVerifier(): string {
    return crypto.randomBytes(64).toString('base64url');
  }

  generateCodeChallenge(codeVerifier: string): string {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }

  generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  buildAuthUrl(params: {
    state: string;
    codeChallenge: string;
    nonce: string;
  }): string {
    const clientId = this.configService.get<string>('telegram.clientId');
    const appUrl = this.configService.get<string>('appUrl');
    const redirectUri = `${appUrl}/auth/callback`;

    const searchParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile phone',
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.TELEGRAM_AUTH_URL}?${searchParams.toString()}`;
  }

  async exchangeCodeForTokens(params: {
    code: string;
    codeVerifier: string;
  }): Promise<{ access_token: string; id_token: string; expires_in: number }> {
    const clientId = this.configService.get<string>('telegram.clientId');
    const clientSecret = this.configService.get<string>('telegram.clientSecret');
    const appUrl = this.configService.get<string>('appUrl');
    const redirectUri = `${appUrl}/auth/callback`;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: params.codeVerifier,
    });

    try {
      const response = await axios.post(this.TELEGRAM_TOKEN_URL, body.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        timeout: 10000,
      });
      return response.data;
    } catch (err) {
      const detail = err.response?.data?.error ?? err.message;
      throw new UnauthorizedException(`Token exchange failed: ${detail}`);
    }
  }

  async validateIdToken(idToken: string, expectedNonce: string): Promise<TelegramUser> {
    const clientId = this.configService.get<string>('telegram.clientId');

    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.TELEGRAM_ISSUER,
        audience: clientId,
      });

      if (!payload.nonce || payload.nonce !== expectedNonce) {
        throw new Error('nonce mismatch');
      }

      return payload as unknown as TelegramUser;
    } catch (error) {
      throw new UnauthorizedException('Invalid id_token: ' + error.message);
    }
  }
}
