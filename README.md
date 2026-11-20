# HireTrack – Smart Recruitment & Job Application Management System

Full-stack recruitment platform: recruiters publish jobs and move candidates through a hiring pipeline; candidates search jobs, upload a resume and track every application.

**Stack:** HTML/CSS/vanilla JS · Node.js + Express · MongoDB (Mongoose) · JWT + bcrypt · Cloudinary · REST

## Quick start
```bash
cd backend
npm install
cp .env.example .env      # set MONGO_URI and JWT_SECRET (Cloudinary optional)
npm run seed              # optional demo data
npm start                 # http://localhost:5000  (serves the frontend too)
```
Demo logins after seeding: `admin@hiretrack.dev / admin123`, `recruiter@hiretrack.dev / recruiter123`, `candidate@hiretrack.dev / candidate123`.

Resumes go to Cloudinary when the three `CLOUDINARY_*` variables are set; otherwise they are saved to `backend/uploads/` so the app works locally with no account.

## Structure
```
HireTrack/
├── frontend/            index.html, css/style.css, js/app.js (hash-routed SPA)
├── backend/
│   ├── config/          db.js, cloudinary.js
│   ├── controllers/     auth, job, application, dashboard, admin
│   ├── middleware/      auth (JWT + RBAC), validate, upload (multer), error (central handler)
│   ├── models/          User, Job, Application
│   ├── routes/
│   ├── utils/           ApiError, asyncHandler, token, uploadResume, seed
│   └── server.js
└── README.md
```

## Roles
| Role | Can do |
|---|---|
| Candidate | Browse/search jobs, upload resume, apply once per job, track/withdraw applications, own dashboard |
| Recruiter | CRUD **own** jobs, view applicants, set status (Applied / Shortlisted / Rejected / Selected), dashboard stats |
| Admin | Everything recruiters can do on all jobs, plus manage users (role, enable/disable, delete) |

Public sign-up allows Candidate and Recruiter only. Create admins via the seed script or by changing a role in the DB / Users page.

## API (all under `/api`, JWT as `Authorization: Bearer <token>`)
| Method & path | Access | Purpose |
|---|---|---|
| POST `/auth/register`, `/auth/login` | public | Sign up / log in |
| GET `/auth/me` · PUT `/auth/profile` · PUT `/auth/password` | any user | Profile |
| POST `/auth/resume` (multipart `resume`) · DELETE `/auth/resume` | any user | Resume upload (PDF/DOC/DOCX ≤ 5 MB) |
| GET `/jobs?q&skills&location&experience&salaryMin&salaryMax&jobType&page&limit` | logged in | Search & filter open jobs |
| GET `/jobs/:id` | logged in | Job detail |
| GET `/jobs/mine` | recruiter, admin | Own jobs with applicant counts |
| POST/PUT/DELETE `/jobs[/:id]` | recruiter (owner), admin | Manage jobs |
| POST `/jobs/:jobId/apply` | candidate | Apply (needs resume) |
| GET `/jobs/:jobId/applications?status=` | recruiter (owner), admin | List applicants |
| GET `/applications/mine` · DELETE `/applications/:id` | candidate | Track / withdraw |
| PATCH `/applications/:id/status` | recruiter (owner), admin | `{status, notes}` |
| GET `/dashboard` | any role | Role-specific statistics |
| GET/PATCH/DELETE `/admin/users[/:id]` | admin | User management |

Filter semantics: `experience=N` returns jobs whose minimum required experience ≤ N; salary filters match any job whose range overlaps the requested range; `skills` matches any listed skill.

## Notes
- Errors use one JSON shape: `{ success:false, message, details? }`, produced by `middleware/error.js`.
- Passwords are hashed with bcrypt (12 rounds); `bcryptjs` is used so no native build is needed.
- Not included yet: automated tests, email notifications, rate limiting. Add these before production use.
