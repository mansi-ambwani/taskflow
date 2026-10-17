const ApiError = require('../utils/ApiError');
const { nodeEnv } = require('../config/env');

// 404 for unknown API routes
function notFound(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Central error handler: every error leaves the API in the same JSON shape:
// { success: false, error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  if (!(error instanceof ApiError)) {
    if (err.type === 'entity.parse.failed') {
      error = ApiError.badRequest('Malformed JSON in request body');
    } else if (err.type === 'entity.too.large') {
      error = new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    } else if (err.code === 'ER_DUP_ENTRY') {
      error = ApiError.conflict('A record with this value already exists');
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      error = ApiError.badRequest('Referenced record does not exist');
    } else if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR') {
      error = new ApiError(503, 'DB_UNAVAILABLE', 'Database is not reachable');
    } else {
      error = new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong on our side');
    }
  }

  if (error.status >= 500) console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);

  res.status(error.status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
      ...(nodeEnv === 'development' && error.status >= 500 ? { debug: err.message } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
