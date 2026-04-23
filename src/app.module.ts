import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';

const isServerless = !!process.env.DENO_DEPLOYMENT_ID;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TelegrafModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('telegram.botToken'),
        // On Deno Deploy, skip polling (ephemeral). Webhook is wired up in main.ts.
        launchOptions: isServerless ? false : undefined,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    BotModule,
  ],
})
export class AppModule {}
