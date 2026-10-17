const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

// Slow down brute-force password guessing: 20 attempts / 15 min per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts, try again in 15 minutes' } },
});

const emailRule = body('email').isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false });

router.post(
  '/register',
  authLimiter,
  [
    body('name').isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),
    emailRule,
    body('password')
      .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters')
      .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
      .matches(/\d/).withMessage('Password must contain a number'),
    body('inviteCode').optional({ values: 'falsy' }).isString().isLength({ max: 200 }).withMessage('Invite code is too long'),
  ],
  validate,
  asyncHandler(ctrl.register)
);

router.post(
  '/login',
  authLimiter,
  [emailRule, body('password').notEmpty().withMessage('Password is required')],
  validate,
  asyncHandler(ctrl.login)
);

router.get('/me', authenticate, asyncHandler(ctrl.me));
router.get('/config', asyncHandler(ctrl.config));

module.exports = router;
