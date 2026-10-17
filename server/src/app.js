const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { clientUrl, nodeEnv } = require('./config/env');
const { sanitizeInput } = require('./middleware/sanitize');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const asyncHandler = require('./utils/asyncHandler');
const { getStats } = require('./controllers/statsController');

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/other proxies (for rate limiting)

// ── Security & parsing middleware (order matters) ──────────────
app.use(helmet());
app.use(cors({ origin: clientUrl.split(',').map((s) => s.trim()), credentials: true }));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
app.use(sanitizeInput);
if (nodeEnv !== 'test') app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

// ── API routes ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.get('/api/stats', authenticate, asyncHandler(getStats));
app.use('/api', notFound);

// ── Serve the built React app in production (single deployable service) ──
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

module.exports = app;
