const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`\n❌ Missing environment variables: ${missing.join(', ')}`);
  console.error('   Copy server/.env.example to server/.env and fill in the values.\n');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('paste_')) {
  console.warn('⚠️  JWT_SECRET looks weak. Run `npm run gen:secret` and paste the output into .env');
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // Empty = anyone can sign up. Set it to require an invite code at sign-up.
  inviteCode: (process.env.INVITE_CODE || '').trim(),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
};
