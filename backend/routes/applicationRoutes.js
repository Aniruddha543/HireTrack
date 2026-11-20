const router = require('express').Router();
const { body } = require('express-validator');
const apps = require('../controllers/applicationController');
const Application = require('../models/Application');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/mine', authorize('candidate'), apps.myApplications);
router.patch(
  '/:id/status',
  authorize('recruiter', 'admin'),
  [body('status').optional().isIn(Application.STATUSES).withMessage(`Status must be one of: ${Application.STATUSES.join(', ')}.`)],
  validate,
  apps.updateStatus
);
router.delete('/:id', authorize('candidate'), apps.withdraw);

module.exports = router;
