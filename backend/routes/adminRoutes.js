const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/users', c.listUsers);
router.patch('/users/:id', [body('role').optional().isIn(['admin', 'recruiter', 'candidate']).withMessage('Invalid role.')], validate, c.updateUser);
router.delete('/users/:id', c.deleteUser);

module.exports = router;
