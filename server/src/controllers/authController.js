const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { signToken } = require('../middleware/auth');
const { inviteCode } = require('../config/env');
const ApiError = require('../utils/ApiError');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// Constant-time comparison so the invite code can't be guessed character by character from response timing.
function inviteMatches(given) {
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(inviteCode).digest();
  return crypto.timingSafeEqual(a, b);
}

// GET /api/auth/config  — tells the sign-up page whether an invite code is required.
exports.config = async (req, res) => {
  res.json({ success: true, data: { inviteRequired: Boolean(inviteCode) } });
};

// POST /api/auth/register  — new accounts are always "member"; admins are promoted by an admin.
// When INVITE_CODE is set, sign-up only works with that code (keeps strangers out of the team).
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (inviteCode && !inviteMatches(req.body.inviteCode)) {
    throw new ApiError(403, 'INVALID_INVITE', 'Invalid or missing invite code. Ask your team admin for the invite link.');
  }
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw ApiError.conflict('An account with this email already exists');

  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'member')`,
    [name, email, hash]
  );
  const user = { id: result.insertId, name, email, role: 'member' };
  res.status(201).json({ success: true, data: { user, token: signToken(user) } });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT id, name, email, role, password_hash FROM users WHERE email = ?', [email]);
  const user = rows[0];
  // Same message for "no user" and "wrong password" so attackers can't discover valid emails.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  res.json({ success: true, data: { user: publicUser(user), token: signToken(user) } });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ success: true, data: { user: publicUser(req.user) } });
};
