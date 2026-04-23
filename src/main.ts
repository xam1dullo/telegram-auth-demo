import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getBotToken } from 'nestjs-telegraf';
import type { Telegraf } from 'telegraf';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  console.log('[boot] env check:', {
    APP_URL: !!process.env.APP_URL,
    PORT: process.env.PORT || 3000,
    TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_CLIENT_ID: !!process.env.TELEGRAM_CLIENT_ID,
    TELEGRAM_CLIENT_SECRET: !!process.env.TELEGRAM_CLIENT_SECRET,
    SESSION_SECRET: !!process.env.SESSION_SECRET || "sasmasdlamsdkamlskdnl"
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const appUrl = configService.get<string>('appUrl');
  const sessionSecret = configService.get<string>('session.secret');
  const isProd = process.env.NODE_ENV === 'production' || appUrl.startsWith('https://');

  app.use(cookieParser());

  app.use(
    cookieSession({
      name: 'tgsess',
      keys: [sessionSecret],
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.enableCors({
    origin: appUrl,
    credentials: true,
  });

  // On Deno Deploy: register Telegram bot via webhook instead of polling.
  const isServerless = !!process.env.DENO_DEPLOYMENT_ID;
  if (isServerless) {
    try {
      const bot = app.get<Telegraf>(getBotToken());
      const webhookPath = '/telegraf';
      app.use(bot.webhookCallback(webhookPath));
      await bot.telegram.setWebhook(`${appUrl}${webhookPath}`);
      console.log(`[bot] webhook set: ${appUrl}${webhookPath}`);
    } catch (e: any) {
      console.error('[bot] webhook setup failed:', e?.message ?? e);
    }
  }

  await app.listen(port);
  console.log(`🚀 Application is running on: ${appUrl}`);
}

process.on('unhandledRejection', (err: any) => {
  // Keep the process alive on non-fatal async errors (e.g. Telegraf polling 409).
  console.error('[unhandledRejection]', err?.message ?? err);
});

bootstrap().catch((err) => {
  console.error('[boot] Fatal startup error:', err?.message ?? err);
  console.error(err?.stack);
  process.exit(1);
});
