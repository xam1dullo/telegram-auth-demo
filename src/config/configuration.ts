function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
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
    secret: required('SESSION_SECRET'),
  },
});
