const mongoose = require('mongoose');

const STATUSES = ['Applied', 'Shortlisted', 'Rejected', 'Selected'];

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coverLetter: { type: String, maxlength: 3000 },
    resume: { url: String, originalName: String },
    status: { type: String, enum: STATUSES, default: 'Applied' },
    notes: { type: String, maxlength: 1000 },
    history: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// A candidate can apply to a job only once
applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

applicationSchema.statics.STATUSES = STATUSES;
module.exports = mongoose.model('Application', applicationSchema);
