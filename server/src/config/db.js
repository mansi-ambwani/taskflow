const mysql = require('mysql2/promise');
const { db } = require('./env');

// Connection pool: reuses connections instead of opening one per request.
const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: ['DATE'],
  ...(db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
});

async function checkConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

module.exports = { pool, checkConnection };
