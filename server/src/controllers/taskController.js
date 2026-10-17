const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');

// Only these columns may be used for sorting (prevents SQL injection through ORDER BY).
const SORTABLE = {
  created_at: 't.created_at',
  updated_at: 't.updated_at',
  due_date: 't.due_date',
  priority: "FIELD(t.priority, 'low','medium','high')",
  title: 't.title',
};

// Select only the columns the UI needs and join user names in the same query (no N+1 lookups).
const TASK_COLUMNS = `
  t.id, t.title, t.description, t.status, t.priority, t.due_date,
  t.created_by, t.assigned_to, t.created_at, t.updated_at,
  c.name AS created_by_name, a.name AS assigned_to_name`;
const TASK_FROM = `
  FROM tasks t
  JOIN users c ON c.id = t.created_by
  LEFT JOIN users a ON a.id = t.assigned_to`;

// Builds a parameterised WHERE clause from the query string + the caller's role.
function buildFilters(query, user) {
  const where = [];
  const params = [];

  // Members only ever see tasks they created or that are assigned to them.
  if (user.role !== 'admin') {
    where.push('(t.assigned_to = ? OR t.created_by = ?)');
    params.push(user.id, user.id);
  }
  if (query.status) { where.push('t.status = ?'); params.push(query.status); }
  if (query.priority) { where.push('t.priority = ?'); params.push(query.priority); }
  if (query.assignedTo === 'me') { where.push('t.assigned_to = ?'); params.push(user.id); }
  else if (query.assignedTo === 'unassigned') { where.push('t.assigned_to IS NULL'); }
  else if (query.assignedTo) { where.push('t.assigned_to = ?'); params.push(Number(query.assignedTo)); }
  if (query.overdue === 'true') { where.push("t.due_date < CURDATE() AND t.status <> 'done'"); }
  if (query.search) {
    // FULLTEXT index search with prefix matching ("rep" matches "report").
    const terms = query.search
      .replace(/[+\-<>()~*"@]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8)
      .map((w) => `+${w}*`)
      .join(' ');
    if (terms) { where.push('MATCH(t.title, t.description) AGAINST (? IN BOOLEAN MODE)'); params.push(terms); }
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function findVisibleTask(id, user) {
  const [rows] = await pool.query(`SELECT ${TASK_COLUMNS} ${TASK_FROM} WHERE t.id = ?`, [id]);
  const task = rows[0];
  if (!task) throw ApiError.notFound('Task not found');
  if (user.role !== 'admin' && task.created_by !== user.id && task.assigned_to !== user.id) {
    throw ApiError.notFound('Task not found'); // don't reveal that the task exists
  }
  return task;
}

async function assertUserExists(id) {
  const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!rows.length) throw ApiError.badRequest('Assigned user does not exist');
}

// GET /api/tasks?page=1&limit=10&status=&priority=&search=&assignedTo=&overdue=&sortBy=&order=
exports.listTasks = async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const sortCol = SORTABLE[req.query.sortBy] || SORTABLE.created_at;
  const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

  const { sql, params } = buildFilters(req.query, req.user);

  // Data page and total count run in parallel on two pooled connections.
  const [[rows], [[{ total }]]] = await Promise.all([
    pool.query(
      `SELECT ${TASK_COLUMNS} ${TASK_FROM} ${sql} ORDER BY ${sortCol} ${order}, t.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) AS total FROM tasks t ${sql}`, params),
  ]);

  res.json({
    success: true,
    data: rows,
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
};

// GET /api/tasks/:id
exports.getTask = async (req, res) => {
  const task = await findVisibleTask(req.params.id, req.user);
  res.json({ success: true, data: task });
};

// POST /api/tasks
exports.createTask = async (req, res) => {
  const { title, description = null, status = 'todo', priority = 'medium', dueDate = null } = req.body;
  let assignedTo = req.body.assignedTo ?? null;

  // Members can only assign tasks to themselves (or leave unassigned).
  if (req.user.role !== 'admin' && assignedTo !== null && Number(assignedTo) !== req.user.id) {
    throw ApiError.forbidden('Members can only assign tasks to themselves');
  }
  if (assignedTo !== null) await assertUserExists(assignedTo);

  const [result] = await pool.query(
    `INSERT INTO tasks (title, description, status, priority, due_date, created_by, assigned_to)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, description || null, status, priority, dueDate || null, req.user.id, assignedTo]
  );
  const task = await findVisibleTask(result.insertId, req.user);
  res.status(201).json({ success: true, data: task });
};

// PATCH /api/tasks/:id   (partial update)
exports.updateTask = async (req, res) => {
  const task = await findVisibleTask(req.params.id, req.user);
  const isAdmin = req.user.role === 'admin';
  const isCreator = task.created_by === req.user.id;

  const fieldMap = { title: 'title', description: 'description', status: 'status', priority: 'priority', dueDate: 'due_date', assignedTo: 'assigned_to' };
  const updates = Object.keys(fieldMap).filter((k) => req.body[k] !== undefined);
  if (!updates.length) throw ApiError.badRequest('Nothing to update');

  // Permission rules:
  //  admin           → everything
  //  creator         → everything except assigning to other people
  //  assignee only   → status only
  if (!isAdmin && !isCreator && updates.some((k) => k !== 'status')) {
    throw ApiError.forbidden('Assignees can only change the status of a task');
  }
  if (updates.includes('assignedTo') && req.body.assignedTo !== null) {
    if (!isAdmin && Number(req.body.assignedTo) !== req.user.id) {
      throw ApiError.forbidden('Members can only assign tasks to themselves');
    }
    await assertUserExists(req.body.assignedTo);
  }

  const setSql = updates.map((k) => `${fieldMap[k]} = ?`).join(', ');
  const values = updates.map((k) => (req.body[k] === '' ? null : req.body[k]));
  await pool.query(`UPDATE tasks SET ${setSql} WHERE id = ?`, [...values, task.id]);

  res.json({ success: true, data: await findVisibleTask(task.id, req.user) });
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res) => {
  const task = await findVisibleTask(req.params.id, req.user);
  if (req.user.role !== 'admin' && task.created_by !== req.user.id) {
    throw ApiError.forbidden('Only the creator or an admin can delete this task');
  }
  await pool.query('DELETE FROM tasks WHERE id = ?', [task.id]);
  res.json({ success: true, data: { id: task.id } });
};
