export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    clientId: process.env.TELEGRAM_CLIENT_ID,
    clientSecret: process.env.TELEGRAM_CLIENT_SECRET,
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
  },
});
