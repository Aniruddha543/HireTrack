const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    company: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    jobType: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'], default: 'full-time' },
    skills: [{ type: String, trim: true, lowercase: true }],
    experienceMin: { type: Number, default: 0, min: 0 },
    experienceMax: { type: Number, default: 0, min: 0 },
    salaryMin: { type: Number, default: 0, min: 0 },
    salaryMax: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    deadline: Date,
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: 'text', description: 'text', company: 'text' });

module.exports = mongoose.model('Job', jobSchema);
