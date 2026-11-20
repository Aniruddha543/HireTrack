const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { storeResume, removeResume } = require('../utils/uploadResume');

const splitList = (v) =>
  (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim().toLowerCase()).filter(Boolean);

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'candidate', company } = req.body;
  const allowedRoles = ['candidate', 'recruiter'];
  if (process.env.ALLOW_ADMIN_SIGNUP === 'true') allowedRoles.push('admin');
  if (!allowedRoles.includes(role)) throw new ApiError(400, 'You can register as a candidate or a recruiter.');
  if (role === 'recruiter' && !company) throw new ApiError(400, 'Company name is required for recruiters.');

  const user = await User.create({ name, email, password, role, company });
  res.status(201).json({ success: true, token: signToken(user), user });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Incorrect email or password.');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled.');
  res.json({ success: true, token: signToken(user), user });
});

exports.me = asyncHandler(async (req, res) => res.json({ success: true, user: req.user }));

exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, headline, company, skills } = req.body;
  const user = req.user;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (headline !== undefined) user.headline = headline;
  if (company !== undefined && user.role !== 'candidate') user.company = company;
  if (skills !== undefined) user.skills = splitList(skills);
  await user.save();
  res.json({ success: true, user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect.');
  user.password = req.body.newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
});

exports.uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Please attach a resume file (field name: resume).');
  const stored = await storeResume(req.file, req.user._id);
  await removeResume(req.user.resume);
  req.user.resume = { ...stored, uploadedAt: new Date() };
  await req.user.save();
  res.status(201).json({ success: true, resume: req.user.resume });
});

exports.deleteResume = asyncHandler(async (req, res) => {
  await removeResume(req.user.resume);
  req.user.resume = undefined;
  await req.user.save();
  res.json({ success: true, message: 'Resume removed.' });
});
