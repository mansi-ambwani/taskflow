const { pool } = require('../config/db');

// GET /api/stats — numbers for the dashboard. Admin sees the whole team; members see their own work.
exports.getStats = async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const scope = isAdmin ? '' : 'WHERE (assigned_to = ? OR created_by = ?)';
  const scopeParams = isAdmin ? [] : [req.user.id, req.user.id];

  // One aggregate query instead of one COUNT per status.
  const [[summary]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(status = 'todo')        AS todo,
            SUM(status = 'in_progress') AS in_progress,
            SUM(status = 'review')      AS review,
            SUM(status = 'done')        AS done,
            SUM(priority = 'high' AND status <> 'done') AS high_open,
            SUM(due_date < CURDATE() AND status <> 'done') AS overdue,
            SUM(due_date BETWEEN CURDATE() AND CURDATE() + INTERVAL 7 DAY AND status <> 'done') AS due_this_week
       FROM tasks ${scope}`,
    scopeParams
  );
  const toNum = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v) || 0]));
  const data = { summary: toNum(summary) };

  if (isAdmin) {
    const [[{ users }]] = await pool.query('SELECT COUNT(*) AS users FROM users');
    const [workload] = await pool.query(
      `SELECT u.id, u.name,
              SUM(t.status <> 'done') AS open_tasks,
              SUM(t.status = 'done')  AS done_tasks
         FROM users u JOIN tasks t ON t.assigned_to = u.id
        GROUP BY u.id, u.name
        ORDER BY open_tasks DESC
        LIMIT 8`
    );
    data.summary.users = Number(users);
    data.workload = workload.map((w) => ({ ...w, open_tasks: Number(w.open_tasks), done_tasks: Number(w.done_tasks) }));
  }

  // Upcoming deadlines for the dashboard list
  const [upcoming] = await pool.query(
    `SELECT id, title, priority, status, due_date FROM tasks
      ${scope ? scope + ' AND' : 'WHERE'} status <> 'done' AND due_date IS NOT NULL
      ORDER BY due_date ASC LIMIT 5`,
    scopeParams
  );
  data.upcoming = upcoming;

  res.json({ success: true, data });
};
