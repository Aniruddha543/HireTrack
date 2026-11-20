const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/** Verifies the Bearer token and attaches the user to req.user */
exports.protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required. Please log in.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired or invalid. Please log in again.');
  }
  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or disabled.');
  req.user = user;
  next();
});

/** RBAC: allow only the listed roles */
exports.authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, `Role '${req.user.role}' is not allowed to perform this action.`));
  }
  next();
};
