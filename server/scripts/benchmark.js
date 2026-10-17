// Query-performance benchmark:  npm run benchmark
//
// Builds a separate database (taskflow_bench) with the same fake data in two tables:
//   • tasks_baseline  — no secondary indexes, queried the "naive" way
//                       (SELECT *, LIKE '%term%' search, one COUNT per status, N+1 name lookups)
//   • tasks_optimized — the composite + FULLTEXT indexes from db/schema.sql, queried the way the API does
// Then times the same API scenarios against both and prints the median response-time reduction.
// Your real "taskflow" database is never touched.
//
// Options (env vars):  BENCH_ROWS=100000  BENCH_RUNS=15
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROWS = Number(process.env.BENCH_ROWS) || 100000;
const RUNS = Number(process.env.BENCH_RUNS) || 15;
const USERS = 300;
const DB = 'taskflow_bench';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];
const WORDS = ['login', 'report', 'invoice', 'dashboard', 'api', 'bug', 'deploy', 'review', 'design', 'database',
  'search', 'mobile', 'payment', 'email', 'cache', 'docs', 'release', 'testing', 'onboarding', 'analytics'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const TABLE_COLUMNS = `
  id INT UNSIGNED PRIMARY KEY,
  title VARCHAR(150) NOT NULL, description TEXT NULL,
  status ENUM('todo','in_progress','review','done') NOT NULL,
  priority ENUM('low','medium','high') NOT NULL,
  due_date DATE NULL, created_by INT UNSIGNED NOT NULL, assigned_to INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL`;

const OPTIMIZED_INDEXES = `,
  KEY idx_tasks_assignee_status_created (assigned_to, status, created_at),
  KEY idx_tasks_creator_status_created  (created_by, status, created_at),
  KEY idx_tasks_status_priority_created (status, priority, created_at),
  KEY idx_tasks_due_status (due_date, status),
  FULLTEXT KEY ft_tasks_title_desc (title, description)`;

async function setup(conn) {
  console.log(`\n⏳ Building ${DB} with ${ROWS.toLocaleString()} tasks and ${USERS} users (one-time, ~1 min)…`);
  await conn.query(`DROP DATABASE IF EXISTS ${DB}`);
  await conn.query(`CREATE DATABASE ${DB}`);
  await conn.query(`USE ${DB}`);
  await conn.query('CREATE TABLE users (id INT UNSIGNED PRIMARY KEY, name VARCHAR(80) NOT NULL)');
  await conn.query(`CREATE TABLE tasks_baseline (${TABLE_COLUMNS}) ENGINE=InnoDB`);
  await conn.query(`CREATE TABLE tasks_optimized (${TABLE_COLUMNS}${OPTIMIZED_INDEXES}) ENGINE=InnoDB`);

  await conn.query('INSERT INTO users VALUES ?', [Array.from({ length: USERS }, (_, i) => [i + 1, `User ${i + 1}`])]);

  const now = Date.now();
  const BATCH = 5000;
  for (let start = 0; start < ROWS; start += BATCH) {
    const rows = [];
    for (let i = start; i < Math.min(start + BATCH, ROWS); i++) {
      const created = new Date(now - Math.random() * 365 * 86400000);
      const due = Math.random() < 0.85 ? new Date(now + (Math.random() * 120 - 60) * 86400000) : null;
      rows.push([
        i + 1,
        `${pick(WORDS)} ${pick(WORDS)} task ${i + 1}`,
        `Work on the ${pick(WORDS)} module and update the ${pick(WORDS)} flow`,
        pick(STATUSES), pick(PRIORITIES), due,
        1 + Math.floor(Math.random() * USERS),
        Math.random() < 0.9 ? 1 + Math.floor(Math.random() * USERS) : null,
        created, created,
      ]);
    }
    await conn.query('INSERT INTO tasks_baseline VALUES ?', [rows]);
  }
  await conn.query('INSERT INTO tasks_optimized SELECT * FROM tasks_baseline');
  await conn.query('ANALYZE TABLE tasks_baseline, tasks_optimized, users');
}

// ── The scenarios: each mirrors a real API call ──────────────────────────────
const scenarios = [
  {
    name: 'Member task list (status filter + page 3)',
    async baseline(c, u) {
      const [rows] = await c.query(
        `SELECT * FROM tasks_baseline WHERE (assigned_to = ? OR created_by = ?) AND status = 'in_progress'
         ORDER BY created_at DESC LIMIT 10 OFFSET 20`, [u, u]);
      for (const r of rows) { // N+1 name lookups
        await c.query('SELECT name FROM users WHERE id = ?', [r.created_by]);
        if (r.assigned_to) await c.query('SELECT name FROM users WHERE id = ?', [r.assigned_to]);
      }
      await c.query(`SELECT COUNT(*) FROM tasks_baseline WHERE (assigned_to = ? OR created_by = ?) AND status = 'in_progress'`, [u, u]);
    },
    async optimized(c, u) {
      await c.query(
        `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_by, t.assigned_to, t.created_at,
                cu.name AS created_by_name, au.name AS assigned_to_name
           FROM tasks_optimized t JOIN users cu ON cu.id = t.created_by LEFT JOIN users au ON au.id = t.assigned_to
          WHERE (t.assigned_to = ? OR t.created_by = ?) AND t.status = 'in_progress'
          ORDER BY t.created_at DESC LIMIT 10 OFFSET 20`, [u, u]);
      await c.query(`SELECT COUNT(*) FROM tasks_optimized t WHERE (t.assigned_to = ? OR t.created_by = ?) AND t.status = 'in_progress'`, [u, u]);
    },
  },
  {
    name: 'Admin list (status + priority filter, page 1)',
    async baseline(c) {
      const [rows] = await c.query(
        `SELECT * FROM tasks_baseline WHERE status = 'todo' AND priority = 'high' ORDER BY created_at DESC LIMIT 10`);
      for (const r of rows) {
        await c.query('SELECT name FROM users WHERE id = ?', [r.created_by]);
        if (r.assigned_to) await c.query('SELECT name FROM users WHERE id = ?', [r.assigned_to]);
      }
      await c.query(`SELECT COUNT(*) FROM tasks_baseline WHERE status = 'todo' AND priority = 'high'`);
    },
    async optimized(c) {
      await c.query(
        `SELECT t.id, t.title, t.status, t.priority, t.due_date, t.created_at, cu.name, au.name
           FROM tasks_optimized t JOIN users cu ON cu.id = t.created_by LEFT JOIN users au ON au.id = t.assigned_to
          WHERE t.status = 'todo' AND t.priority = 'high' ORDER BY t.created_at DESC LIMIT 10`);
      await c.query(`SELECT COUNT(*) FROM tasks_optimized WHERE status = 'todo' AND priority = 'high'`);
    },
  },
  {
    name: 'Keyword search ("invoice")',
    async baseline(c) {
      await c.query(`SELECT * FROM tasks_baseline WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC LIMIT 10`, ['%invoice%', '%invoice%']);
      await c.query(`SELECT COUNT(*) FROM tasks_baseline WHERE title LIKE ? OR description LIKE ?`, ['%invoice%', '%invoice%']);
    },
    async optimized(c) {
      await c.query(`SELECT id, title, status, priority FROM tasks_optimized WHERE MATCH(title, description) AGAINST (? IN BOOLEAN MODE) ORDER BY created_at DESC LIMIT 10`, ['+invoice*']);
      await c.query(`SELECT COUNT(*) FROM tasks_optimized WHERE MATCH(title, description) AGAINST (? IN BOOLEAN MODE)`, ['+invoice*']);
    },
  },
  {
    name: "Member dashboard stats",
    async baseline(c, u) {
      for (const s of STATUSES) {
        await c.query('SELECT COUNT(*) FROM tasks_baseline WHERE (assigned_to = ? OR created_by = ?) AND status = ?', [u, u, s]);
      }
      await c.query(`SELECT COUNT(*) FROM tasks_baseline WHERE (assigned_to = ? OR created_by = ?) AND due_date < CURDATE() AND status <> 'done'`, [u, u]);
      await c.query(`SELECT COUNT(*) FROM tasks_baseline WHERE (assigned_to = ? OR created_by = ?) AND priority = 'high' AND status <> 'done'`, [u, u]);
    },
    async optimized(c, u) {
      await c.query(
        `SELECT COUNT(*), SUM(status='todo'), SUM(status='in_progress'), SUM(status='review'), SUM(status='done'),
                SUM(priority='high' AND status<>'done'), SUM(due_date < CURDATE() AND status<>'done')
           FROM tasks_optimized WHERE (assigned_to = ? OR created_by = ?)`, [u, u]);
    },
  },
  {
    name: 'Overdue tasks list',
    async baseline(c) {
      await c.query(`SELECT * FROM tasks_baseline WHERE due_date < CURDATE() AND status <> 'done' ORDER BY due_date ASC LIMIT 10`);
      await c.query(`SELECT COUNT(*) FROM tasks_baseline WHERE due_date < CURDATE() AND status <> 'done'`);
    },
    async optimized(c) {
      await c.query(`SELECT id, title, status, priority, due_date FROM tasks_optimized WHERE due_date < CURDATE() AND status <> 'done' ORDER BY due_date ASC LIMIT 10`);
      await c.query(`SELECT COUNT(*) FROM tasks_optimized WHERE due_date < CURDATE() AND status <> 'done'`);
    },
  },
];

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

async function time(fn, conn) {
  await fn(conn, 7); // warm-up
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const user = 1 + ((i * 37) % USERS);
    const t0 = process.hrtime.bigint();
    await fn(conn, user);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  return median(times);
}

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const [exists] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ? AND table_name = 'tasks_optimized'`, [DB]);
  let rowsOk = false;
  if (exists[0].n) {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM ${DB}.tasks_optimized`);
    rowsOk = n === ROWS;
  }
  if (!rowsOk) await setup(conn);
  await conn.query(`USE ${DB}`);

  console.log(`\n📊 Median time per API scenario over ${RUNS} runs (${ROWS.toLocaleString()} tasks)\n`);
  const results = [];
  for (const s of scenarios) {
    const before = await time(s.baseline, conn);
    const after = await time(s.optimized, conn);
    results.push({ Scenario: s.name, 'Before (ms)': before.toFixed(2), 'After (ms)': after.toFixed(2), Reduction: `${(((before - after) / before) * 100).toFixed(1)}%`, before, after });
  }
  console.table(results.map(({ before, after, ...r }) => r));

  const totalBefore = results.reduce((s, r) => s + r.before, 0);
  const totalAfter = results.reduce((s, r) => s + r.after, 0);
  const avgReduction = results.reduce((s, r) => s + (r.before - r.after) / r.before, 0) / results.length;
  console.log(`Total across scenarios: ${totalBefore.toFixed(1)} ms → ${totalAfter.toFixed(1)} ms`);
  console.log(`➡️  Overall reduction: ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%   (average per scenario: ${(avgReduction * 100).toFixed(1)}%)\n`);
  console.log('Tip: drop the benchmark database afterwards with  DROP DATABASE taskflow_bench;\n');
  await conn.end();
})().catch((e) => {
  console.error('❌ Benchmark failed:', e.message);
  process.exit(1);
});
