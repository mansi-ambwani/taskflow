// Checks that the MySQL credentials in server/.env work.  Exit codes: 0 ok, 2 wrong user/password, 3 MySQL not reachable, 1 other
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    const [[row]] = await conn.query('SELECT VERSION() AS v');
    console.log(`OK - connected to MySQL ${row.v}`);
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.log(`FAILED - ${err.code || ''} ${err.message}`);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') process.exit(2);
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') process.exit(3);
    process.exit(1);
  }
})();
