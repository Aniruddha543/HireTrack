const router = require('express').Router();
const { body } = require('express-validator');
const jobs = require('../controllers/jobController');
const apps = require('../controllers/applicationController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

const jobRules = [
  body('title').trim().notEmpty().withMessage('Job title is required.'),
  body('description').trim().notEmpty().withMessage('Description is required.'),
  body('location').trim().notEmpty().withMessage('Location is required.'),
];

router.use(protect);

router.get('/', jobs.listJobs);
router.get('/mine', authorize('recruiter', 'admin'), jobs.myJobs); // must precede '/:id'
router.post('/', authorize('recruiter', 'admin'), jobRules, validate, jobs.createJob);
router.get('/:id', jobs.getJob);
router.put('/:id', authorize('recruiter', 'admin'), jobs.updateJob);
router.delete('/:id', authorize('recruiter', 'admin'), jobs.deleteJob);

router.post('/:jobId/apply', authorize('candidate'), apps.apply);
router.get('/:jobId/applications', authorize('recruiter', 'admin'), apps.jobApplications);

module.exports = router;
