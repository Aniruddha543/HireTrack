const Application = require('../models/Application');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { canManage } = require('./jobController');

/** POST /api/jobs/:jobId/apply  (candidate) */
exports.apply = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) throw new ApiError(404, 'Job not found.');
  if (job.status !== 'open' || (job.deadline && job.deadline < new Date()))
    throw new ApiError(400, 'This job is no longer accepting applications.');
  if (!req.user.resume || !req.user.resume.url)
    throw new ApiError(400, 'Upload your resume in your profile before applying.');

  const application = await Application.create({
    job: job._id,
    candidate: req.user._id,
    coverLetter: req.body.coverLetter,
    resume: { url: req.user.resume.url, originalName: req.user.resume.originalName },
    history: [{ status: 'Applied', changedBy: req.user._id }],
  });
  res.status(201).json({ success: true, application });
});

/** GET /api/applications/mine (candidate) */
exports.myApplications = asyncHandler(async (req, res) => {
  const applications = await Application.find({ candidate: req.user._id })
    .populate('job', 'title company location status')
    .sort({ createdAt: -1 });
  res.json({ success: true, applications });
});

/** GET /api/jobs/:jobId/applications (job owner / admin) — optional ?status= */
exports.jobApplications = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.jobId);
  if (!job) throw new ApiError(404, 'Job not found.');
  if (!canManage(req.user, job)) throw new ApiError(403, 'You can only view applications for your own jobs.');
  const filter = { job: job._id };
  if (req.query.status) filter.status = req.query.status;
  const applications = await Application.find(filter)
    .populate('candidate', 'name email phone skills headline resume')
    .sort({ createdAt: -1 });
  res.json({ success: true, job, applications });
});

/** PATCH /api/applications/:id/status (job owner / admin) */
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const application = await Application.findById(req.params.id).populate('job');
  if (!application) throw new ApiError(404, 'Application not found.');
  if (!canManage(req.user, application.job)) throw new ApiError(403, 'You can only manage applications for your own jobs.');

  if (status && status !== application.status) {
    application.status = status;
    application.history.push({ status, changedBy: req.user._id });
  }
  if (notes !== undefined) application.notes = notes;
  await application.save();
  res.json({ success: true, application });
});

/** DELETE /api/applications/:id — candidate withdraws (only while still "Applied") */
exports.withdraw = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application || String(application.candidate) !== String(req.user._id)) throw new ApiError(404, 'Application not found.');
  if (application.status !== 'Applied') throw new ApiError(400, 'Only applications still in "Applied" status can be withdrawn.');
  await application.deleteOne();
  res.json({ success: true, message: 'Application withdrawn.' });
});
