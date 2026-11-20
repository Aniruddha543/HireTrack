/* HireTrack frontend – vanilla JS single-page app (hash routing) */
const API = window.HIRETRACK_API || '/api';
const STATUSES = ['Applied', 'Shortlisted', 'Rejected', 'Selected'];
const COLORS = { Applied: 'var(--applied)', Shortlisted: 'var(--shortlisted)', Selected: 'var(--selected)', Rejected: 'var(--rejected)' };
const state = { token: localStorage.getItem('ht_token'), user: null };
const $ = (s, r = document) => r.querySelector(s);
const app = () => $('#app');

/* ---------- helpers ---------- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const lpa = (n) => `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)} LPA`;
const pay = (j) => (j.salaryMax ? `${lpa(j.salaryMin)} – ${lpa(j.salaryMax)}` : 'Salary not disclosed');
const exp = (j) => (j.experienceMax ? `${j.experienceMin}–${j.experienceMax} yrs` : j.experienceMin ? `${j.experienceMin}+ yrs` : 'Freshers welcome');
const chips = (a = []) => `<div class="chips">${a.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>`;
const pill = (s) => `<span class="pill ${esc(s)}">${esc(s)}</span>`;

function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'toast' + (isErr ? ' err' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3800);
}

async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API + path, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && state.token) logout(true);
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

function modal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  const close = () => (root.innerHTML = '');
  root.querySelector('.overlay').addEventListener('mousedown', (e) => e.target.classList.contains('overlay') && close());
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  return { root, close };
}

/* ---------- auth & nav ---------- */
function logout(expired) {
  state.token = null; state.user = null;
  localStorage.removeItem('ht_token');
  if (expired) toast('Session expired. Please log in again.', true);
  location.hash = '#/login';
}
function setSession(data) {
  state.token = data.token; state.user = data.user;
  localStorage.setItem('ht_token', data.token);
}
const NAV = {
  candidate: [['#/dashboard', 'Dashboard'], ['#/jobs', 'Find jobs'], ['#/applications', 'My applications'], ['#/profile', 'Profile & resume']],
  recruiter: [['#/dashboard', 'Dashboard'], ['#/my-jobs', 'My jobs'], ['#/jobs', 'All jobs'], ['#/profile', 'Profile']],
  admin: [['#/dashboard', 'Dashboard'], ['#/users', 'Users'], ['#/my-jobs', 'All jobs'], ['#/profile', 'Profile']],
};
function renderTopbar() {
  const u = state.user;
  const cur = location.hash.split('?')[0];
  $('#topbar').innerHTML = `<a class="logo" href="#/"><i></i>HireTrack</a>
    <nav>${u ? NAV[u.role].map(([h, l]) => `<a href="${h}" class="${cur === h ? 'active' : ''}">${l}</a>`).join('') : ''}</nav>
    <div class="who">${u ? `${esc(u.name)} <span class="role-tag">${u.role}</span><button class="btn ghost sm" id="logout" style="color:#fff;border-color:rgba(255,255,255,.3)">Log out</button>`
      : `<a class="btn ghost sm" href="#/login" style="color:#fff;border-color:rgba(255,255,255,.3)">Log in</a><a class="btn sm" href="#/register">Create account</a>`}</div>`;
  $('#logout')?.addEventListener('click', () => logout());
}

/* ---------- router ---------- */
const routes = [
  [/^#\/?$/, home, null],
  [/^#\/login$/, loginView, null],
  [/^#\/register$/, registerView, null],
  [/^#\/dashboard$/, dashboardView, ['candidate', 'recruiter', 'admin']],
  [/^#\/jobs$/, jobsView, ['candidate', 'recruiter', 'admin']],
  [/^#\/applications$/, myApplicationsView, ['candidate']],
  [/^#\/profile$/, profileView, ['candidate', 'recruiter', 'admin']],
  [/^#\/my-jobs$/, myJobsView, ['recruiter', 'admin']],
  [/^#\/jobs\/([a-f0-9]{24})\/applicants$/, applicantsView, ['recruiter', 'admin']],
  [/^#\/users$/, usersView, ['admin']],
];

async function router() {
  if (state.token && !state.user) {
    try { state.user = (await api('/auth/me')).user; } catch { state.token = null; }
  }
  const hash = location.hash.split('?')[0] || '#/';
  const match = routes.map(([re, fn, roles]) => [hash.match(re), fn, roles]).find(([m]) => m);
  renderTopbar();
  if (!match) return (app().innerHTML = `<div class="empty"><h2>Page not found</h2><a href="#/">Go home</a></div>`);
  const [m, fn, roles] = match;
  if (roles && !state.user) return (location.hash = '#/login');
  if (roles && !roles.includes(state.user.role)) return (location.hash = '#/dashboard');
  app().innerHTML = '<p class="muted">Loading…</p>';
  try { await fn(m[1]); } catch (e) { app().innerHTML = `<div class="empty"><h2>Something went wrong</h2><p>${esc(e.message)}</p></div>`; }
  app().focus({ preventScroll: true });
}
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

/* ---------- views ---------- */
function home() {
  if (state.user) return (location.hash = '#/dashboard');
  app().innerHTML = `<section class="hero">
    <h1>Every opening, applicant and decision in one place.</h1>
    <p class="muted">Recruiters post roles and move candidates from Applied to Selected. Candidates search by skill, location, experience and salary, then follow each application to the end.</p>
    <p><a class="btn" href="#/register">Create a free account</a> <a class="btn ghost" href="#/login">Log in</a></p></section>`;
}

function authForm(title, fields, submitLabel, onSubmit, footer) {
  app().innerHTML = `<div class="panel auth"><h2>${title}</h2><form id="f" novalidate>${fields}<button class="btn" style="width:100%">${submitLabel}</button></form><p class="muted small" style="margin:1rem 0 0">${footer}</p></div>`;
  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true;
    try { await onSubmit(Object.fromEntries(new FormData(e.target))); }
    catch (err) { toast(err.message, true); btn.disabled = false; }
  });
}

function loginView() {
  authForm('Log in',
    `<div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required /></div>
     <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required /></div>`,
    'Log in',
    async (d) => { setSession(await api('/auth/login', { method: 'POST', body: d })); location.hash = '#/dashboard'; },
    `New here? <a href="#/register">Create an account</a>`);
}

function registerView() {
  authForm('Create your account',
    `<div class="field"><label for="name">Full name</label><input id="name" name="name" required /></div>
     <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" required /></div>
     <div class="field"><label for="password">Password (min 6 characters)</label><input id="password" name="password" type="password" minlength="6" required /></div>
     <div class="field"><label for="role">I am a</label><select id="role" name="role"><option value="candidate">Candidate looking for a job</option><option value="recruiter">Recruiter hiring for a company</option></select></div>
     <div class="field" id="co" hidden><label for="company">Company name</label><input id="company" name="company" /></div>`,
    'Create account',
    async (d) => { setSession(await api('/auth/register', { method: 'POST', body: d })); location.hash = '#/dashboard'; },
    `Already registered? <a href="#/login">Log in</a>`);
  $('#role').addEventListener('change', (e) => ($('#co').hidden = e.target.value !== 'recruiter'));
}

/* Dashboard */
async function dashboardView() {
  const { stats: s, recent, role } = await api('/dashboard');
  const funnel = (st, total) => `<div class="funnel">${STATUSES.map((k) => `<div style="width:${total ? (st[k] / total) * 100 : 0}%;background:${COLORS[k]}"></div>`).join('')}</div>
    <div class="legend">${STATUSES.map((k) => `<span><i style="background:${COLORS[k]}"></i>${k} ${st[k]}</span>`).join('')}</div>`;
  const card = (n, l) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`;

  if (role === 'candidate') {
    app().innerHTML = `<div class="page-head"><div><h1>Hello, ${esc(state.user.name.split(' ')[0])}</h1><p class="muted">Here is where your applications stand.</p></div><a class="btn" href="#/jobs">Find jobs</a></div>
      <div class="stats">${card(s.totalApplications, 'Applications sent')}${card(s.statuses.Shortlisted, 'Shortlisted')}${card(s.statuses.Selected, 'Selected')}${card(s.openJobs, 'Open jobs')}</div>
      <div class="panel"><h3>Application outcomes</h3>${funnel(s.statuses, s.totalApplications)}</div>
      <h3 style="margin-top:1.5rem">Recent applications</h3>
      ${recent.length ? `<div class="table-wrap"><table><tr><th>Job</th><th>Company</th><th>Applied</th><th>Status</th></tr>${recent.map((a) => `<tr><td>${esc(a.job?.title)}</td><td>${esc(a.job?.company)}</td><td>${date(a.createdAt)}</td><td>${pill(a.status)}</td></tr>`).join('')}</table></div>` : `<div class="empty">You haven't applied anywhere yet. <a href="#/jobs">Browse open jobs</a>.</div>`}`;
    return;
  }

  const adminCards = role === 'admin' ? card(Object.values(s.users || {}).reduce((a, b) => a + b, 0), 'Registered users') : '';
  app().innerHTML = `<div class="page-head"><div><h1>${role === 'admin' ? 'Platform overview' : 'Recruitment dashboard'}</h1><p class="muted">Live totals across ${role === 'admin' ? 'all jobs' : 'your jobs'}.</p></div>
      <a class="btn" href="#/my-jobs">${role === 'admin' ? 'Manage jobs' : 'Post or manage jobs'}</a></div>
    <div class="stats">${card(s.totalJobs, 'Total jobs')}${card(s.openJobs, 'Open jobs')}${card(s.totalApplications, 'Applications')}${card(s.shortlisted, 'Shortlisted')}${card(s.selected, 'Selected')}${card(s.selectionRate + '%', 'Selection rate')}${adminCards}</div>
    <div class="two">
      <div class="panel"><h3>Pipeline</h3>${funnel(s.statuses, s.totalApplications)}</div>
      <div class="panel"><h3>Most applied-to jobs</h3>${s.topJobs.length ? s.topJobs.map((t) => `<div class="bar-row"><span>${esc(t.title)}</span><div><div style="width:${(t.applications / s.topJobs[0].applications) * 100}%"></div></div><b>${t.applications}</b></div>`).join('') : '<p class="muted">No applications yet.</p>'}</div>
    </div>
    <h3 style="margin-top:1.5rem">Latest applications</h3>
    ${recent.length ? `<div class="table-wrap"><table><tr><th>Candidate</th><th>Job</th><th>Applied</th><th>Status</th></tr>${recent.map((a) => `<tr><td>${esc(a.candidate?.name)}</td><td>${esc(a.job?.title)}</td><td>${date(a.createdAt)}</td><td>${pill(a.status)}</td></tr>`).join('')}</table></div>` : '<div class="empty">New applications will appear here.</div>'}`;
}

/* Browse jobs */
const jobCard = (j) => `<article class="job" data-id="${j._id}" tabindex="0">
  <div><h3>${esc(j.title)}</h3><div class="meta"><span>${esc(j.company)}</span><span>${esc(j.location)}</span><span>${esc(j.jobType)}</span><span>${exp(j)}</span></div>${chips(j.skills)}</div>
  <div class="pay">${pay(j)}<div class="muted small" style="font-weight:400">Posted ${date(j.createdAt)}</div></div></article>`;

async function jobsView() {
  const f = Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
  app().innerHTML = `<div class="page-head"><h1>Find jobs</h1></div><div class="layout">
    <form class="panel filters" id="flt">
      <div class="field"><label for="q">Keyword</label><input id="q" name="q" placeholder="Title or company" value="${esc(f.q)}" /></div>
      <div class="field"><label for="skills">Skills (comma separated)</label><input id="skills" name="skills" placeholder="node, react" value="${esc(f.skills)}" /></div>
      <div class="field"><label for="location">Location</label><input id="location" name="location" value="${esc(f.location)}" /></div>
      <div class="field"><label for="experience">Your experience (years)</label><input id="experience" name="experience" type="number" min="0" value="${esc(f.experience)}" /></div>
      <div class="grid2"><div class="field"><label for="salaryMin">Min salary (₹)</label><input id="salaryMin" name="salaryMin" type="number" min="0" step="50000" value="${esc(f.salaryMin)}" /></div>
      <div class="field"><label for="salaryMax">Max salary (₹)</label><input id="salaryMax" name="salaryMax" type="number" min="0" step="50000" value="${esc(f.salaryMax)}" /></div></div>
      <div class="field"><label for="jobType">Job type</label><select id="jobType" name="jobType"><option value="">Any</option>${['full-time', 'part-time', 'contract', 'internship', 'remote'].map((t) => `<option ${f.jobType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <button class="btn" style="width:100%">Apply filters</button> <a href="#/jobs" class="btn ghost" style="width:100%;margin-top:.5rem;text-align:center">Clear</a>
    </form><section id="results"><p class="muted">Loading…</p></section></div>`;
  $('#flt').addEventListener('submit', (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    new FormData(e.target).forEach((v, k) => v && p.set(k, v));
    location.hash = '#/jobs' + (p.toString() ? '?' + p : '');
  });
  const page = Number(f.page) || 1;
  const qs = new URLSearchParams({ ...f, page });
  const data = await api('/jobs?' + qs);
  $('#results').innerHTML = `<p class="muted">${data.total} job${data.total === 1 ? '' : 's'} found</p>` +
    (data.jobs.length ? data.jobs.map(jobCard).join('') : '<div class="empty">No jobs match these filters. Try removing a filter or widening the salary range.</div>') +
    (data.pages > 1 ? `<div class="pager"><button class="btn ghost sm" id="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${data.page} of ${data.pages}</span><button class="btn ghost sm" id="next" ${page >= data.pages ? 'disabled' : ''}>Next</button></div>` : '');
  const go = (n) => { const p = new URLSearchParams({ ...f, page: n }); location.hash = '#/jobs?' + p; };
  $('#prev')?.addEventListener('click', () => go(page - 1));
  $('#next')?.addEventListener('click', () => go(page + 1));
  $('#results').addEventListener('click', (e) => { const c = e.target.closest('.job'); c && openJob(c.dataset.id); });
  $('#results').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const c = e.target.closest('.job'); c && openJob(c.dataset.id); } });
}

async function openJob(id) {
  const { job } = await api('/jobs/' + id);
  const isCand = state.user.role === 'candidate';
  const m = modal(`<div class="modal-head"><div><h2>${esc(job.title)}</h2><div class="meta"><span>${esc(job.company)}</span><span>${esc(job.location)}</span><span>${esc(job.jobType)}</span></div></div><button data-close aria-label="Close">×</button></div>
    <p><b>${pay(job)}</b> &nbsp;·&nbsp; ${exp(job)}${job.deadline ? ` &nbsp;·&nbsp; Apply by ${date(job.deadline)}` : ''}</p>${chips(job.skills)}
    <div class="desc">${esc(job.description)}</div>
    ${isCand ? `<form id="apply"><div class="field"><label for="cl">Cover letter (optional)</label><textarea id="cl" name="coverLetter" maxlength="3000"></textarea></div>
      <p class="muted small">We'll send the resume saved in your profile${state.user.resume ? ` (${esc(state.user.resume.originalName)})` : ' — you haven’t uploaded one yet'}.</p>
      <button class="btn">Submit application</button></form>` : ''}`);
  $('#apply', m.root)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api(`/jobs/${id}/apply`, { method: 'POST', body: { coverLetter: e.target.coverLetter.value } });
      toast('Application submitted'); m.close(); location.hash = '#/applications';
    } catch (err) { toast(err.message, true); }
  });
}

/* Candidate: my applications */
async function myApplicationsView() {
  const { applications } = await api('/applications/mine');
  const track = (s) => {
    const last = s === 'Rejected' ? 'Rejected' : 'Selected';
    const idx = { Applied: 0, Shortlisted: 1, Selected: 2, Rejected: 2 }[s];
    return `<div class="track s-${s}">${['Applied', 'Shortlisted', last].map((l, i) => `<div class="step ${i <= idx ? 'done' : ''} ${i === 2 ? 'last' : ''}">${l}</div>`).join('')}</div>`;
  };
  app().innerHTML = `<div class="page-head"><h1>My applications</h1></div>` + (applications.length ? applications.map((a) => `<div class="panel" style="margin-bottom:.8rem">
      <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap"><div><h3 style="margin:0">${esc(a.job?.title || 'Job removed')}</h3><span class="muted small">${esc(a.job?.company)} · ${esc(a.job?.location)} · applied ${date(a.createdAt)}</span></div>
      ${a.status === 'Applied' ? `<button class="btn ghost sm" data-withdraw="${a._id}">Withdraw</button>` : pill(a.status)}</div>${track(a.status)}</div>`).join('')
    : `<div class="empty">No applications yet. <a href="#/jobs">Find a job to apply for</a>.</div>`);
  app().querySelectorAll('[data-withdraw]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Withdraw this application?')) return;
    try { await api('/applications/' + b.dataset.withdraw, { method: 'DELETE' }); toast('Application withdrawn'); router(); } catch (e) { toast(e.message, true); }
  }));
}

/* Profile */
async function profileView() {
  const u = state.user;
  const isCand = u.role === 'candidate';
  app().innerHTML = `<div class="page-head"><h1>Profile</h1></div><div class="two">
    <form class="panel" id="pf"><h3>Your details</h3>
      <div class="field"><label>Name</label><input name="name" value="${esc(u.name)}" required /></div>
      <div class="field"><label>Email</label><input value="${esc(u.email)}" disabled /></div>
      <div class="field"><label>Phone</label><input name="phone" value="${esc(u.phone)}" /></div>
      ${isCand ? `<div class="field"><label>Headline</label><input name="headline" value="${esc(u.headline)}" placeholder="e.g. Full-stack developer" /></div>
      <div class="field"><label>Skills (comma separated)</label><input name="skills" value="${esc((u.skills || []).join(', '))}" /></div>`
        : u.role === 'recruiter' ? `<div class="field"><label>Company</label><input name="company" value="${esc(u.company)}" /></div>` : ''}
      <button class="btn">Save profile</button></form>
    <div>
      ${isCand ? `<div class="panel" style="margin-bottom:1rem"><h3>Resume</h3>
        ${u.resume ? `<p>Current file: <a href="${esc(u.resume.url)}" target="_blank" rel="noopener">${esc(u.resume.originalName)}</a><br><span class="muted small">Uploaded ${date(u.resume.uploadedAt)}</span></p>` : '<p class="muted">No resume uploaded. You need one to apply for jobs.</p>'}
        <form id="rf"><div class="field"><input type="file" name="resume" accept=".pdf,.doc,.docx" required /></div>
        <p class="muted small">PDF, DOC or DOCX, up to 5 MB.</p><button class="btn">${u.resume ? 'Replace resume' : 'Upload resume'}</button>
        ${u.resume ? '<button type="button" class="btn ghost" id="rm">Remove</button>' : ''}</form></div>` : ''}
      <form class="panel" id="pw"><h3>Change password</h3>
        <div class="field"><label>Current password</label><input type="password" name="currentPassword" required /></div>
        <div class="field"><label>New password</label><input type="password" name="newPassword" minlength="6" required /></div>
        <button class="btn">Update password</button></form></div></div>`;
  const submit = (sel, fn) => $(sel)?.addEventListener('submit', async (e) => { e.preventDefault(); try { await fn(e.target); } catch (err) { toast(err.message, true); } });
  submit('#pf', async (f) => { state.user = (await api('/auth/profile', { method: 'PUT', body: Object.fromEntries(new FormData(f)) })).user; toast('Profile saved'); renderTopbar(); });
  submit('#rf', async (f) => { await api('/auth/resume', { method: 'POST', form: new FormData(f) }); state.user = (await api('/auth/me')).user; toast('Resume uploaded'); profileView(); });
  submit('#pw', async (f) => { await api('/auth/password', { method: 'PUT', body: Object.fromEntries(new FormData(f)) }); f.reset(); toast('Password updated'); });
  $('#rm')?.addEventListener('click', async () => { await api('/auth/resume', { method: 'DELETE' }); state.user = (await api('/auth/me')).user; toast('Resume removed'); profileView(); });
}

/* Recruiter: my jobs */
async function myJobsView() {
  const { jobs } = await api('/jobs/mine');
  app().innerHTML = `<div class="page-head"><div><h1>${state.user.role === 'admin' ? 'All jobs' : 'My jobs'}</h1><p class="muted">${jobs.length} posting${jobs.length === 1 ? '' : 's'}</p></div><button class="btn" id="new">Post a job</button></div>` +
    (jobs.length ? `<div class="table-wrap"><table><tr><th>Title</th><th>Location</th><th>Status</th><th>Applicants</th><th></th></tr>${jobs.map((j) => `<tr><td><b>${esc(j.title)}</b><br><span class="muted small">${esc(j.company)} · ${pay(j)}</span></td><td>${esc(j.location)}</td><td>${pill(j.status)}</td><td>${j.applicationCount}</td>
      <td><div class="row-actions"><a class="btn sm" href="#/jobs/${j._id}/applicants">Applicants</a><button class="btn ghost sm" data-edit="${j._id}">Edit</button><button class="btn ghost sm" data-del="${j._id}">Delete</button></div></td></tr>`).join('')}</table></div>`
      : '<div class="empty">You haven’t posted a job yet. Post your first opening to start receiving applications.</div>');
  $('#new').addEventListener('click', () => jobForm());
  app().querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => jobForm(jobs.find((j) => j._id === b.dataset.edit))));
  app().querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Delete this job and all its applications?')) return;
    try { await api('/jobs/' + b.dataset.del, { method: 'DELETE' }); toast('Job deleted'); myJobsView(); } catch (e) { toast(e.message, true); }
  }));
}

function jobForm(j = {}) {
  const v = (k, d = '') => esc(j[k] ?? d);
  const m = modal(`<div class="modal-head"><h2>${j._id ? 'Edit job' : 'Post a job'}</h2><button data-close aria-label="Close">×</button></div>
    <form id="jf"><div class="grid2"><div class="field"><label>Job title</label><input name="title" value="${v('title')}" required /></div>
    <div class="field"><label>Company</label><input name="company" value="${esc(j.company || state.user.company || '')}" required /></div></div>
    <div class="grid2"><div class="field"><label>Location</label><input name="location" value="${v('location')}" required /></div>
    <div class="field"><label>Job type</label><select name="jobType">${['full-time', 'part-time', 'contract', 'internship', 'remote'].map((t) => `<option ${j.jobType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div></div>
    <div class="field"><label>Required skills (comma separated)</label><input name="skills" value="${esc((j.skills || []).join(', '))}" /></div>
    <div class="grid2"><div class="field"><label>Min experience (yrs)</label><input type="number" min="0" name="experienceMin" value="${v('experienceMin', 0)}" /></div>
    <div class="field"><label>Max experience (yrs)</label><input type="number" min="0" name="experienceMax" value="${v('experienceMax', 0)}" /></div></div>
    <div class="grid2"><div class="field"><label>Min salary (₹ per year)</label><input type="number" min="0" name="salaryMin" value="${v('salaryMin', 0)}" /></div>
    <div class="field"><label>Max salary (₹ per year)</label><input type="number" min="0" name="salaryMax" value="${v('salaryMax', 0)}" /></div></div>
    <div class="grid2"><div class="field"><label>Application deadline</label><input type="date" name="deadline" value="${j.deadline ? j.deadline.slice(0, 10) : ''}" /></div>
    <div class="field"><label>Status</label><select name="status"><option value="open" ${j.status !== 'closed' ? 'selected' : ''}>open</option><option value="closed" ${j.status === 'closed' ? 'selected' : ''}>closed</option></select></div></div>
    <div class="field"><label>Description</label><textarea name="description" required>${v('description')}</textarea></div>
    <button class="btn">${j._id ? 'Save changes' : 'Publish job'}</button></form>`);
  $('#jf', m.root).addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target));
    ['experienceMin', 'experienceMax', 'salaryMin', 'salaryMax'].forEach((k) => (body[k] = Number(body[k] || 0)));
    if (!body.deadline) delete body.deadline;
    try {
      await api(j._id ? '/jobs/' + j._id : '/jobs', { method: j._id ? 'PUT' : 'POST', body });
      toast(j._id ? 'Changes saved' : 'Job published'); m.close(); myJobsView();
    } catch (err) { toast(err.message, true); }
  });
}

/* Recruiter: applicants for a job */
async function applicantsView(jobId) {
  const status = new URLSearchParams(location.hash.split('?')[1] || '').get('status') || '';
  const { job, applications } = await api(`/jobs/${jobId}/applications${status ? '?status=' + status : ''}`);
  app().innerHTML = `<div class="page-head"><div><a href="#/my-jobs" class="small">← Back to jobs</a><h1>${esc(job.title)}</h1><p class="muted">${esc(job.location)} · ${applications.length} applicant${applications.length === 1 ? '' : 's'}${status ? ' (' + status + ')' : ''}</p></div>
    <select id="sf" style="width:auto" aria-label="Filter by status"><option value="">All statuses</option>${STATUSES.map((s) => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>` +
    (applications.length ? `<div class="table-wrap"><table><tr><th>Candidate</th><th>Skills</th><th>Resume</th><th>Applied</th><th>Status</th></tr>${applications.map((a) => `<tr>
      <td><b>${esc(a.candidate?.name)}</b><br><span class="muted small">${esc(a.candidate?.email)}${a.candidate?.phone ? ' · ' + esc(a.candidate.phone) : ''}</span>${a.coverLetter ? `<details><summary class="small">Cover letter</summary><p class="small" style="white-space:pre-wrap">${esc(a.coverLetter)}</p></details>` : ''}</td>
      <td>${chips(a.candidate?.skills)}</td>
      <td>${a.resume?.url ? `<a href="${esc(a.resume.url)}" target="_blank" rel="noopener">${esc(a.resume.originalName || 'Resume')}</a>` : '—'}</td>
      <td>${date(a.createdAt)}</td>
      <td><select data-app="${a._id}" aria-label="Status">${STATUSES.map((s) => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`).join('')}</table></div>`
      : '<div class="empty">No applicants match yet.</div>');
  $('#sf').addEventListener('change', (e) => (location.hash = `#/jobs/${jobId}/applicants` + (e.target.value ? '?status=' + e.target.value : '')));
  app().querySelectorAll('[data-app]').forEach((s) => s.addEventListener('change', async () => {
    try { await api(`/applications/${s.dataset.app}/status`, { method: 'PATCH', body: { status: s.value } }); toast(`Marked as ${s.value}`); }
    catch (e) { toast(e.message, true); applicantsView(jobId); }
  }));
}

/* Admin: users */
async function usersView() {
  const { users } = await api('/admin/users');
  app().innerHTML = `<div class="page-head"><div><h1>Users</h1><p class="muted">${users.length} accounts</p></div></div><div class="table-wrap"><table><tr><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr>${users.map((u) => {
    const me = u._id === state.user._id;
    return `<tr><td><b>${esc(u.name)}</b><br><span class="muted small">${esc(u.email)}</span></td>
    <td><select data-role="${u._id}" ${me ? 'disabled' : ''}>${['candidate', 'recruiter', 'admin'].map((r) => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
    <td>${u.isActive ? 'Active' : 'Disabled'}</td><td>${date(u.createdAt)}</td>
    <td>${me ? '' : `<div class="row-actions"><button class="btn ghost sm" data-toggle="${u._id}" data-active="${u.isActive}">${u.isActive ? 'Disable' : 'Enable'}</button><button class="btn ghost sm" data-rm="${u._id}">Delete</button></div>`}</td></tr>`;
  }).join('')}</table></div>`;
  const act = async (fn, msg) => { try { await fn(); toast(msg); usersView(); } catch (e) { toast(e.message, true); } };
  app().querySelectorAll('[data-role]').forEach((s) => s.addEventListener('change', () => act(() => api('/admin/users/' + s.dataset.role, { method: 'PATCH', body: { role: s.value } }), 'Role updated')));
  app().querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => act(() => api('/admin/users/' + b.dataset.toggle, { method: 'PATCH', body: { isActive: b.dataset.active !== 'true' } }), 'Account updated')));
  app().querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => confirm('Delete this user and all their data?') && act(() => api('/admin/users/' + b.dataset.rm, { method: 'DELETE' }), 'User deleted')));
}
