const Job = require('../models/Job');
const Application = require('../models/Application');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const toList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim().toLowerCase()).filter(Boolean);
const FIELDS = ['title', 'company', 'description', 'location', 'jobType', 'skills', 'experienceMin', 'experienceMax', 'salaryMin', 'salaryMax', 'status', 'deadline'];

const pick = (body) => {
  const data = {};
  FIELDS.forEach((f) => body[f] !== undefined && (data[f] = body[f]));
  if (data.skills !== undefined) data.skills = toList(data.skills);
  return data;
};

const canManage = (user, job) => user.role === 'admin' || String(job.postedBy) === String(user._id);

/** GET /api/jobs  — search + filters: q, skills, location, experience, salaryMin, salaryMax, jobType */
exports.listJobs = asyncHandler(async (req, res) => {
  const { q, skills, location, experience, salaryMin, salaryMax, jobType, page = 1, limit = 12, sort = 'newest' } = req.query;
  const filter = { status: 'open' };

  if (q) filter.$or = ['title', 'company', 'description'].map((f) => ({ [f]: { $regex: escapeRegex(q), $options: 'i' } }));
  if (skills) filter.skills = { $in: toList(skills) };
  if (location) filter.location = { $regex: escapeRegex(location), $options: 'i' };
  if (jobType) filter.jobType = jobType;
  // "I have N years of experience" -> jobs whose minimum requirement is <= N
  if (experience !== undefined && experience !== '') filter.experienceMin = { $lte: Number(experience) };
  // salary overlap: job's range intersects the requested range
  if (salaryMin) filter.salaryMax = { $gte: Number(salaryMin) };
  if (salaryMax) filter.salaryMin = { $lte: Number(salaryMax) };

  const sortBy = { newest: { createdAt: -1 }, salary: { salaryMax: -1 } }[sort] || { createdAt: -1 };
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));

  const [jobs, total] = await Promise.all([
    Job.find(filter).sort(sortBy).skip((p - 1) * l).limit(l),
    Job.countDocuments(filter),
  ]);
  res.json({ success: true, total, page: p, pages: Math.ceil(total / l), jobs });
});

exports.getJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id).populate('postedBy', 'name company');
  if (!job) throw new ApiError(404, 'Job not found.');
  res.json({ success: true, job });
});

/** GET /api/jobs/mine — jobs posted by the logged-in recruiter (admin sees all) */
exports.myJobs = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { postedBy: req.user._id };
  const jobs = await Job.find(filter).sort({ createdAt: -1 }).lean();
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: '$job', n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({ success: true, jobs: jobs.map((j) => ({ ...j, applicationCount: map[String(j._id)] || 0 })) });
});

exports.createJob = asyncHandler(async (req, res) => {
  const data = pick(req.body);
  if (!data.company) data.company = req.user.company;
  if (data.experienceMax < data.experienceMin || data.salaryMax < data.salaryMin)
    throw new ApiError(400, 'Maximum experience/salary cannot be lower than the minimum.');
  const job = await Job.create({ ...data, postedBy: req.user._id });
  res.status(201).json({ success: true, job });
});

exports.updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found.');
  if (!canManage(req.user, job)) throw new ApiError(403, 'You can only edit your own job postings.');
  job.set(pick(req.body));
  if (job.experienceMax < job.experienceMin || job.salaryMax < job.salaryMin)
    throw new ApiError(400, 'Maximum experience/salary cannot be lower than the minimum.');
  await job.save();
  res.json({ success: true, job });
});

exports.deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) throw new ApiError(404, 'Job not found.');
  if (!canManage(req.user, job)) throw new ApiError(403, 'You can only delete your own job postings.');
  await Application.deleteMany({ job: job._id });
  await job.deleteOne();
  res.json({ success: true, message: 'Job and its applications deleted.' });
});

exports.canManage = canManage;
