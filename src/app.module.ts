import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TelegrafModule.forRootAsync({
      useFactory: () => ({
        token: process.env.TELEGRAM_BOT_TOKEN,
      }),
    }),
    AuthModule,
    BotModule,
  ],
})
export class AppModule {}
