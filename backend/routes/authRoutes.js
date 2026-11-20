const router = require('express').Router();
const { body } = require('express-validator');
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  c.register
);
router.post(
  '/login',
  [body('email').isEmail().withMessage('Enter a valid email address.').normalizeEmail(), body('password').notEmpty().withMessage('Password is required.')],
  validate,
  c.login
);

router.use(protect);
router.get('/me', c.me);
router.put('/profile', c.updateProfile);
router.put(
  '/password',
  [body('currentPassword').notEmpty().withMessage('Current password is required.'), body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.')],
  validate,
  c.changePassword
);
router.post('/resume', upload.single('resume'), c.uploadResume);
router.delete('/resume', c.deleteResume);

module.exports = router;
