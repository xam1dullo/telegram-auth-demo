import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
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

  await app.listen(port);
  console.log(`🚀 Application is running on: ${appUrl}`);
}

bootstrap().catch((err) => {
  console.error('[boot] Fatal startup error:', err?.message ?? err);
  console.error(err?.stack);
  process.exit(1);
});
