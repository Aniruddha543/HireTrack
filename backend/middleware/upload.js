const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/ApiError');

const ALLOWED = ['.pdf', '.doc', '.docx'];

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ALLOWED.includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new ApiError(400, 'Resume must be a PDF, DOC or DOCX file.'), ok);
  },
});
