const app = require('./app');
const { port } = require('./config/env');
const { checkConnection } = require('./config/db');

(async () => {
  try {
    await checkConnection();
    console.log('✅ Connected to MySQL');
  } catch (err) {
    console.error('❌ Could not connect to MySQL:', err.message);
    console.error('   Check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in server/.env and that MySQL is running.');
    console.error('   Did you run `npm run db:setup` first?');
    process.exit(1);
  }
  app.listen(port, () => console.log(`🚀 TaskFlow API running on http://localhost:${port}`));
})();
