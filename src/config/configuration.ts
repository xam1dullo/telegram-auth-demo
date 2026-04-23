import * as crypto from 'node:crypto';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function sessionSecret(): string {
  const v = process.env.SESSION_SECRET;
  if (v) return v;
  console.warn(
    '[config] SESSION_SECRET not set — generating ephemeral secret. ' +
      'Sessions will be invalidated on restart. Set SESSION_SECRET in env!',
  );
  return crypto.randomBytes(32).toString('hex');
}

export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  telegram: {
    botToken: required('TELEGRAM_BOT_TOKEN'),
    clientId: required('TELEGRAM_CLIENT_ID'),
    clientSecret: required('TELEGRAM_CLIENT_SECRET'),
  },
  session: {
    secret: sessionSecret(),
  },
});
