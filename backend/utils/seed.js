// Usage: npm run seed  — creates demo users and jobs (clears existing data!)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Job.deleteMany({}), Application.deleteMany({})]);

  await User.create({ name: 'Admin', email: 'admin@hiretrack.dev', password: 'admin123', role: 'admin' });
  const rec = await User.create({ name: 'Riya Sen', email: 'recruiter@hiretrack.dev', password: 'recruiter123', role: 'recruiter', company: 'Nimbus Labs' });
  await User.create({ name: 'Arjun Das', email: 'candidate@hiretrack.dev', password: 'candidate123', role: 'candidate', skills: ['javascript', 'react', 'node'], headline: 'Full-stack developer' });

  const jobs = [
    ['Backend Engineer', 'Kolkata', 'full-time', ['node', 'mongodb', 'express'], 2, 5, 900000, 1600000],
    ['Frontend Developer', 'Bengaluru', 'full-time', ['javascript', 'react', 'css'], 1, 4, 700000, 1300000],
    ['Data Analyst Intern', 'Remote', 'internship', ['sql', 'python', 'excel'], 0, 1, 180000, 300000],
    ['DevOps Engineer', 'Pune', 'contract', ['docker', 'aws', 'linux'], 3, 7, 1400000, 2400000],
  ];
  for (const [title, location, jobType, skills, experienceMin, experienceMax, salaryMin, salaryMax] of jobs) {
    await Job.create({
      title, location, jobType, skills, experienceMin, experienceMax, salaryMin, salaryMax,
      company: rec.company, postedBy: rec._id,
      description: `We are looking for a ${title} to join ${rec.company}. You will work with a small, product-focused team and own features end to end.`,
    });
  }
  console.log('Seeded. Logins: admin@hiretrack.dev / admin123, recruiter@hiretrack.dev / recruiter123, candidate@hiretrack.dev / candidate123');
  await mongoose.disconnect();
})();
