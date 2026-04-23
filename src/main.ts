import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { NestExpressApplication } from '@nestjs/platform-express';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const sessionSecret = configService.get<string>('session.secret');

  // Cookie parser
  app.use(cookieParser());

  // Session middleware
  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      },
    }),
  );

  // Serve static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`🤖 Telegram Login page: http://localhost:${port}/index.html`);
}
bootstrap();
