const router = require('express').Router();
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/taskController');

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

router.use(authenticate);

const idRule = param('id').isInt({ min: 1 }).withMessage('Invalid task id').toInt();
const assignedToRule = (field) =>
  body(field)
    .optional({ values: 'undefined' })
    .custom((v) => v === null || (Number.isInteger(Number(v)) && Number(v) > 0))
    .withMessage('assignedTo must be a user id or null')
    .customSanitizer((v) => (v === null ? null : Number(v)));

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1, max: 100000 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(STATUSES),
    query('priority').optional().isIn(PRIORITIES),
    query('assignedTo').optional().custom((v) => ['me', 'unassigned'].includes(v) || /^\d+$/.test(v)),
    query('overdue').optional().isIn(['true', 'false']),
    query('search').optional().isLength({ max: 100 }),
    query('sortBy').optional().isIn(['created_at', 'updated_at', 'due_date', 'priority', 'title']),
    query('order').optional().isIn(['asc', 'desc']),
  ],
  validate,
  asyncHandler(ctrl.listTasks)
);

router.get('/:id', idRule, validate, asyncHandler(ctrl.getTask));

router.post(
  '/',
  [
    body('title').isLength({ min: 3, max: 150 }).withMessage('Title must be 3–150 characters'),
    body('description').optional({ values: 'null' }).isLength({ max: 2000 }).withMessage('Description is too long'),
    body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
    body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
    body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Due date must be YYYY-MM-DD'),
    assignedToRule('assignedTo'),
  ],
  validate,
  asyncHandler(ctrl.createTask)
);

router.patch(
  '/:id',
  [
    idRule,
    body('title').optional().isLength({ min: 3, max: 150 }).withMessage('Title must be 3–150 characters'),
    body('description').optional({ values: 'null' }).isLength({ max: 2000 }).withMessage('Description is too long'),
    body('status').optional().isIn(STATUSES).withMessage('Invalid status'),
    body('priority').optional().isIn(PRIORITIES).withMessage('Invalid priority'),
    body('dueDate').optional({ values: 'falsy' }).isISO8601().withMessage('Due date must be YYYY-MM-DD'),
    assignedToRule('assignedTo'),
  ],
  validate,
  asyncHandler(ctrl.updateTask)
);

router.delete('/:id', idRule, validate, asyncHandler(ctrl.deleteTask));

module.exports = router;
