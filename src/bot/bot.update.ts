import { Update, Start, Help, Command, Ctx } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

@Update()
@Injectable()
export class BotUpdate {
  constructor(private configService: ConfigService) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const appUrl = this.configService.get<string>('appUrl');
    const firstName = ctx.from?.first_name || 'Foydalanuvchi';

    await ctx.reply(
      `👋 Salom, ${firstName}!\n\n` +
        `Men Telegram Login demo botiman.\n\n` +
        `🔐 Veb saytga kirish uchun quyidagi tugmani bosing:`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🌐 Saytga kirish',
                url: appUrl,
              },
            ],
            [
              {
                text: '🔑 Login qilish',
                url: `${appUrl}/auth/login`,
              },
            ],
          ],
        },
      },
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply(
      `ℹ️ *Mavjud buyruqlar:*\n\n` +
        `/start - Botni ishga tushirish\n` +
        `/help - Yordam\n` +
        `/login - Login sahifasiga o'tish\n` +
        `/whoami - Hozirgi foydalanuvchi ma'lumotlari\n`,
      { parse_mode: 'Markdown' },
    );
  }

  @Command('login')
  async onLogin(@Ctx() ctx: Context) {
    const appUrl = this.configService.get<string>('appUrl');

    await ctx.reply(`🔑 Login qilish uchun quyidagi havolani bosing:\n\n${appUrl}/auth/login`);
  }

  @Command('whoami')
  async onWhoAmI(@Ctx() ctx: Context) {
    const user = ctx.from;
    if (!user) {
      await ctx.reply('❌ Foydalanuvchi ma\'lumotlari topilmadi.');
      return;
    }

    const info =
      `👤 *Sizning ma'lumotlaringiz (Telegram):*\n\n` +
      `🆔 ID: \`${user.id}\`\n` +
      `👤 Ism: ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}\n` +
      `📛 Username: ${user.username ? '@' + user.username : 'Yo\'q'}\n` +
      `🌐 Til: ${user.language_code || 'Noma\'lum'}\n`;

    await ctx.reply(info, { parse_mode: 'Markdown' });
  }
}
