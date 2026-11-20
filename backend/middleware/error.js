const ApiError = require('../utils/ApiError');

exports.notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// Centralized error handler
exports.errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Server error';
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0].message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0];
    message = field === 'job' || field === 'candidate' ? 'You have already applied to this job.' : `${field || 'Value'} already exists.`;
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB).' : err.message;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
};
