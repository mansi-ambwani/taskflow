const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

// GET /api/users  — admin: paginated list with task counts (one grouped query, no N+1)
exports.listUsers = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const offset = (page - 1) * limit;
  const search = req.query.search ? `%${req.query.search}%` : null;
  const where = search ? 'WHERE u.name LIKE ? OR u.email LIKE ?' : '';
  const params = search ? [search, search] : [];

  const [[rows], [[{ total }]]] = await Promise.all([
    pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.created_at,
              COALESCE(s.open_tasks, 0) AS open_tasks, COALESCE(s.done_tasks, 0) AS done_tasks
         FROM users u
         LEFT JOIN (
           SELECT assigned_to,
                  SUM(status <> 'done') AS open_tasks,
                  SUM(status = 'done')  AS done_tasks
             FROM tasks WHERE assigned_to IS NOT NULL GROUP BY assigned_to
         ) s ON s.assigned_to = u.id
         ${where}
         ORDER BY u.role = 'admin' DESC, u.name ASC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM users u ${where}`, params),
  ]);

  res.json({
    success: true,
    data: rows.map((r) => ({ ...r, open_tasks: Number(r.open_tasks), done_tasks: Number(r.done_tasks) })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
};

// GET /api/users/options — lightweight list for the "assign to" dropdown (admin only)
exports.userOptions = async (req, res) => {
  const [rows] = await pool.query('SELECT id, name FROM users ORDER BY name');
  res.json({ success: true, data: rows });
};

// PATCH /api/users/:id/role
exports.updateRole = async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw ApiError.badRequest('You cannot change your own role');
  const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [req.body.role, id]);
  if (!result.affectedRows) throw ApiError.notFound('User not found');
  const [[user]] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [id]);
  res.json({ success: true, data: user });
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw ApiError.badRequest('You cannot delete your own account');
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
  if (!result.affectedRows) throw ApiError.notFound('User not found');
  res.json({ success: true, data: { id } });
};
