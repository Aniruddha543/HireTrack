const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, users });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (String(user._id) === String(req.user._id)) throw new ApiError(400, 'You cannot change your own role or status.');
  if (req.body.role) user.role = req.body.role;
  if (req.body.isActive !== undefined) user.isActive = Boolean(req.body.isActive);
  await user.save();
  res.json({ success: true, user });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (String(user._id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account.');
  const jobs = await Job.find({ postedBy: user._id }).select('_id');
  await Application.deleteMany({ $or: [{ candidate: user._id }, { job: { $in: jobs.map((j) => j._id) } }] });
  await Job.deleteMany({ postedBy: user._id });
  await user.deleteOne();
  res.json({ success: true, message: 'User and related data deleted.' });
});
