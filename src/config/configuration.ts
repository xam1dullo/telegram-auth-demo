export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  appUrl: process.env.APP_URL || 'https://telegram-auth-demo.xam1dullo.deno.net',
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '8459679224:AAF7QByHI7nvzf9L7bc5j-00DjrG4G1pEQA',
    clientId: process.env.TELEGRAM_CLIENT_ID || '8353311914',
    clientSecret: process.env.TELEGRAM_CLIENT_SECRET || 'iyAgAYcyyujS6Q0AdkkxPAqQ3ZBen11FzY4LI7iIOGvYE89PFdVc6Q',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
  },
});
