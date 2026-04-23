import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import cookieSession from 'cookie-session';
import { NestExpressApplication } from '@nestjs/platform-express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
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
bootstrap();
