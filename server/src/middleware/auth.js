const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the "Authorization: Bearer <token>" header and attaches req.user.
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.secret);
  } catch (err) {
    throw ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Session expired, please log in again' : 'Invalid token');
  }

  // Re-read the user so deleted users / changed roles take effect immediately.
  const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [payload.sub]);
  if (!rows.length) throw ApiError.unauthorized('User no longer exists');
  req.user = rows[0];
  next();
});

// Role guard, e.g. authorize('admin')
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(ApiError.forbidden());
  next();
};

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
}

module.exports = { authenticate, authorize, signToken };
