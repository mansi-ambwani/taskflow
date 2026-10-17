const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.use(authenticate, authorize('admin'));

const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid user id').toInt();

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isLength({ max: 100 }),
  ],
  validate,
  asyncHandler(ctrl.listUsers)
);
router.get('/options', asyncHandler(ctrl.userOptions));
router.patch('/:id/role', [idRule, body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member')], validate, asyncHandler(ctrl.updateRole));
router.delete('/:id', idRule, validate, asyncHandler(ctrl.deleteUser));

module.exports = router;
