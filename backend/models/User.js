const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const resumeSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    provider: { type: String, enum: ['cloudinary', 'local'] },
    originalName: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['admin', 'recruiter', 'candidate'], default: 'candidate' },
    company: { type: String, trim: true },
    phone: { type: String, trim: true },
    skills: [{ type: String, trim: true, lowercase: true }],
    headline: { type: String, trim: true, maxlength: 140 },
    resume: resumeSchema,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
