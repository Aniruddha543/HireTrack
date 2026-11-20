const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cloudinary, cloudinaryEnabled } = require('../config/cloudinary');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

/** Stores a resume buffer in Cloudinary (or locally if Cloudinary isn't configured). */
exports.storeResume = async (file, userId) => {
  if (cloudinaryEnabled) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'hiretrack/resumes', resource_type: 'raw', public_id: `${userId}-${Date.now()}${path.extname(file.originalname)}` },
        (err, result) =>
          err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id, provider: 'cloudinary', originalName: file.originalname })
      );
      stream.end(file.buffer);
    });
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), file.buffer);
  return { url: `/uploads/${name}`, publicId: name, provider: 'local', originalName: file.originalname };
};

exports.removeResume = async (resume) => {
  if (!resume || !resume.publicId) return;
  try {
    if (resume.provider === 'cloudinary') await cloudinary.uploader.destroy(resume.publicId, { resource_type: 'raw' });
    else fs.unlinkSync(path.join(UPLOAD_DIR, resume.publicId));
  } catch (e) {
    console.warn('Could not delete old resume:', e.message);
  }
};
