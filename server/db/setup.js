// One-command database setup:  npm run db:setup
//  1. creates the database + tables (db/schema.sql)
//  2. creates the admin account from ADMIN_EMAIL / ADMIN_PASSWORD in .env
//  3. (optional) adds demo members and sample tasks when SEED_DEMO_DATA=true
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME = 'taskflow', DB_SSL,
  ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD, SEED_DEMO_DATA,
} = process.env;

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env');

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
    ...(DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  // Use the database name from .env (cloud providers often give a fixed name like "defaultdb").
  const schema = fs
    .readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
    .replace(/CREATE DATABASE IF NOT EXISTS taskflow/g, `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``)
    .replace(/USE taskflow;/g, `USE \`${DB_NAME}\`;`);
  await conn.query(schema);
  console.log(`✅ Database "${DB_NAME}" and tables ready`);

  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await conn.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', name = VALUES(name)`,
    [ADMIN_NAME, ADMIN_EMAIL.toLowerCase(), adminHash]
  );
  console.log(`✅ Admin account ready: ${ADMIN_EMAIL.toLowerCase()}`);

  if (SEED_DEMO_DATA === 'true') {
    const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM tasks');
    if (n > 0) {
      console.log('ℹ️  Tasks already exist — skipping demo data');
    } else {
      const demoHash = await bcrypt.hash('Member@123', 12);
      const members = [
        ['Aarav Sharma', 'aarav@taskflow.com'],
        ['Priya Patel', 'priya@taskflow.com'],
        ['Rohan Verma', 'rohan@taskflow.com'],
      ];
      for (const [name, email] of members) {
        await conn.query(
          `INSERT IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')`,
          [name, email, demoHash]
        );
      }
      const [users] = await conn.query('SELECT id, role FROM users ORDER BY id');
      const admin = users.find((u) => u.role === 'admin');
      const memberIds = users.filter((u) => u.role === 'member').map((u) => u.id);

      const day = (offset) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toISOString().slice(0, 10);
      };
      const samples = [
        ['Design login page', 'Responsive login + register screens with validation messages', 'done', 'high', -6],
        ['Set up CI pipeline', 'Run lint and build on every push', 'in_progress', 'medium', 3],
        ['Write API documentation', 'Document every REST endpoint with request/response examples', 'todo', 'medium', 7],
        ['Fix pagination bug', 'Last page shows duplicate rows when sorting by due date', 'review', 'high', 1],
        ['Add task search', 'Full-text search across title and description', 'done', 'medium', -2],
        ['Database backup script', 'Nightly mysqldump to cloud storage', 'todo', 'low', 14],
        ['Prepare sprint demo', 'Slides and live walkthrough for Friday', 'in_progress', 'high', 2],
        ['Update dependencies', 'Patch minor versions and re-run tests', 'todo', 'low', -1],
        ['Accessibility audit', 'Check colour contrast and keyboard navigation', 'todo', 'medium', 10],
        ['Optimise dashboard queries', 'Replace per-status COUNT queries with one aggregate', 'done', 'high', -4],
        ['Onboard new teammate', 'Share repo access and setup guide', 'review', 'low', 5],
        ['Role-based route guards', 'Hide admin pages from members on the client', 'in_progress', 'medium', 4],
      ];
      for (const [i, [title, desc, status, priority, due]] of samples.entries()) {
        await conn.query(
          `INSERT INTO tasks (title, description, status, priority, due_date, created_by, assigned_to)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [title, desc, status, priority, day(due), admin.id, memberIds[i % memberIds.length] || admin.id]
        );
      }
      console.log('✅ Demo data added (members log in with password: Member@123)');
    }
  }

  await conn.end();
  console.log('\n🎉 Setup complete. Start the API with:  npm run dev\n');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('   → Wrong DB_USER or DB_PASSWORD in server/.env');
  if (err.code === 'ECONNREFUSED') console.error('   → MySQL is not running, or DB_HOST/DB_PORT is wrong');
  process.exit(1);
});
