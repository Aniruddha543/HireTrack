const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Application = require('../models/Application');
const asyncHandler = require('../utils/asyncHandler');

const byStatus = (rows) => {
  const out = { Applied: 0, Shortlisted: 0, Rejected: 0, Selected: 0 };
  rows.forEach((r) => (out[r._id] = r.n));
  return out;
};

/** GET /api/dashboard — role-aware statistics */
exports.stats = asyncHandler(async (req, res) => {
  const { role, _id } = req.user;

  if (role === 'candidate') {
    const rows = await Application.aggregate([{ $match: { candidate: _id } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
    const statuses = byStatus(rows);
    const total = Object.values(statuses).reduce((a, b) => a + b, 0);
    const recent = await Application.find({ candidate: _id }).populate('job', 'title company').sort({ createdAt: -1 }).limit(5);
    return res.json({ success: true, role, stats: { totalApplications: total, statuses, openJobs: await Job.countDocuments({ status: 'open' }) }, recent });
  }

  // recruiter: own jobs only, admin: everything
  const jobFilter = role === 'admin' ? {} : { postedBy: _id };
  const jobs = await Job.find(jobFilter).select('_id title status').lean();
  const jobIds = jobs.map((j) => j._id);
  const appFilter = { job: { $in: jobIds } };

  const [rows, perJob, recent] = await Promise.all([
    Application.aggregate([{ $match: { job: { $in: jobIds } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$job', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]),
    Application.find(appFilter).populate('job', 'title').populate('candidate', 'name').sort({ createdAt: -1 }).limit(6),
  ]);
  const statuses = byStatus(rows);
  const total = Object.values(statuses).reduce((a, b) => a + b, 0);
  const titles = Object.fromEntries(jobs.map((j) => [String(j._id), j.title]));

  const stats = {
    totalJobs: jobs.length,
    openJobs: jobs.filter((j) => j.status === 'open').length,
    totalApplications: total,
    shortlisted: statuses.Shortlisted,
    selected: statuses.Selected,
    rejected: statuses.Rejected,
    statuses,
    selectionRate: total ? Math.round((statuses.Selected / total) * 100) : 0,
    topJobs: perJob.map((p) => ({ title: titles[String(p._id)], applications: p.n })),
  };

  if (role === 'admin') {
    const roleRows = await User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]);
    stats.users = Object.fromEntries(roleRows.map((r) => [r._id, r.n]));
  }
  res.json({ success: true, role, stats, recent });
});
