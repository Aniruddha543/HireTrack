require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// API routes
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/jobs', require('./routes/jobRoutes'));
app.use('/api/applications', require('./routes/applicationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Locally stored resumes (used only when Cloudinary isn't configured) + frontend
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use('/api', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing. Copy .env.example to .env and set it.');
  process.exit(1);
}

connectDB()
  .then(() => app.listen(PORT, () => console.log(`HireTrack running at http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });

module.exports = app;
