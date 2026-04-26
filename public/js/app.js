// public/js/app.js — Complete frontend logic with 3 roles, charts, animations

// ── ROLE CONFIG ──
const currentRole = localStorage.getItem('role') || 'builder';
const currentProjectId = localStorage.getItem('projectId') || '';
const currentProjectName = localStorage.getItem('projectName') || '';

if (!localStorage.getItem('role') || !currentProjectId) {
  window.location.href = '/login.html';
}

const ROLE_CAN = {
  builder: {
    viewAll: false, edit: false, delete: false,
    dashboard: false, sites: false, export: false, print: false, bell: false
  },
  manager: {
    viewAll: true, edit: true, delete: false,
    dashboard: true, sites: true, export: true, print: true, bell: true
  },
  admin: {
    viewAll: true, edit: true, delete: true,
    dashboard: true, sites: true, export: true, print: true, bell: true
  }
};
const can = ROLE_CAN[currentRole] || ROLE_CAN.builder;

function projectApi(path) {
  const separator = path.includes('?') ? '&' : '?';
  return path + separator + 'projectId=' + encodeURIComponent(currentProjectId);
}

// ── GLOBAL STATE ──
let allUpdates      = [];
let filteredUpdates = [];
let editingId       = null;
let currentTab      = 'view';
let barChartInst    = null;
let doughnutInst    = null;
let notifsOpen      = false;

// ── PAGE META ──
const PAGE_META = {
  dashboard: { title: 'Dashboard',     subtitle: 'Overview of all construction activity' },
  submit:    { title: 'Submit Update', subtitle: "Log today's site progress" },
  updates:   { title: 'All Updates',   subtitle: 'Browse, search and manage updates' },
  sites:     { title: 'Site Progress', subtitle: 'Latest progress per construction site' },
  admin:     { title: 'Admin Panel',   subtitle: 'System control and permissions' }
};

// ── LOGOUT ──
function logout() {
  localStorage.removeItem('role');
  localStorage.removeItem('username');
  localStorage.removeItem('projectId');
  localStorage.removeItem('projectName');
  localStorage.removeItem('projectCode');
  window.location.href = '/login.html';
}

// ── THEME TOGGLE ──
function toggleTheme() {
  const html  = document.documentElement;
  const theme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  document.getElementById('themeIcon').textContent = theme === 'dark' ? '☀️' : '🌙';
  // Redraw charts with new colours
  if (allUpdates.length > 0) drawCharts(allUpdates);
}

// ── SECTION NAV ──
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('section-' + name).classList.add('active');
  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');

  const meta = PAGE_META[name];
  if (meta) {
    document.getElementById('pageTitle').textContent    = meta.title;
    document.getElementById('pageSubtitle').textContent = meta.subtitle;
  }

  if (name === 'dashboard') loadDashboard();
  if (name === 'updates')   loadUpdates();
  if (name === 'sites')     loadSiteProgress();
  if (name === 'admin')     loadProjectUsers();
}

// ── PAGE LOAD ──
window.onload = function () {
  // Set today's date
  document.getElementById('date').value = new Date().toISOString().split('T')[0];

  if (currentRole === 'builder') {
    showSection('submit');
  } else {
    loadDashboard();
  }
};

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
async function loadDashboard() {
  try {
    const res  = await fetch(projectApi('/updates'));
    const data = await res.json();
    allUpdates = data;

    // Animated stat counters
    animateCount('stat-total',   data.length, '');
    animateCount('stat-sites',   new Set(data.map(u => u.siteName)).size, '');
    animateCount('stat-workers', data.reduce((s, u) => s + u.numberOfWorkers, 0), '');
    animateCount('stat-avg',
      data.length ? Math.round(data.reduce((s,u) => s+u.progressPercentage,0)/data.length) : 0,
      '%');

    drawCharts(data);
    renderRecent(data.slice(0, 5));
    checkNotifications(data);

  } catch(e) {
    document.getElementById('recentUpdates').innerHTML =
      '<p class="empty-state">Could not load data. Is the server running?</p>';
  }
}

// ── Animated counter (counts from 0 to target) ──
function animateCount(id, target, suffix) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.floor(target / 30));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current + suffix;
    if (current >= target) clearInterval(timer);
  }, 30);
}

// ── Chart.js charts ──
function drawCharts(data) {
  const isDark  = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridClr = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const textClr = isDark ? '#7D8590' : '#6B7280';

  // Group by site — latest progress per site
  const siteMap = {};
  [...data].reverse().forEach(u => { siteMap[u.siteName] = u.progressPercentage; });
  const labels = Object.keys(siteMap);
  const values = Object.values(siteMap);

  // ── BAR CHART: progress by site ──
  const barCtx = document.getElementById('barChart').getContext('2d');
  if (barChartInst) barChartInst.destroy();
  barChartInst = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Progress %',
        data: values,
        backgroundColor: values.map(v =>
          v >= 100 ? 'rgba(34,197,94,0.7)' :
          v >= 60  ? 'rgba(245,158,11,0.7)' :
                     'rgba(59,130,246,0.7)'
        ),
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0, max: 100,
          grid:  { color: gridClr },
          ticks: { color: textClr, callback: v => v + '%' }
        },
        x: {
          grid:  { display: false },
          ticks: { color: textClr }
        }
      }
    }
  });

  // ── DOUGHNUT CHART: done vs in progress ──
  const done       = values.filter(v => v >= 100).length;
  const inProgress = values.filter(v => v > 0 && v < 100).length;
  const notStarted = values.filter(v => v === 0).length;

  const dCtx = document.getElementById('doughnutChart').getContext('2d');
  if (doughnutInst) doughnutInst.destroy();
  doughnutInst = new Chart(dCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'In Progress', 'Not Started'],
      datasets: [{
        data: [done, inProgress, notStarted],
        backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(245,158,11,0.8)', 'rgba(59,130,246,0.5)'],
        borderWidth: 0, hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: textClr, padding: 14, font: { size: 11 } }
        }
      }
    }
  });
}

// ── Recent table ──
function renderRecent(recent) {
  if (!recent.length) {
    document.getElementById('recentUpdates').innerHTML =
      '<p class="empty-state">No updates yet. Submit your first update!</p>';
    return;
  }
  let html = '<table style="margin-top:0"><thead><tr><th>Date</th><th>Site</th><th>Workers</th><th>Progress</th></tr></thead><tbody>';
  recent.forEach(u => {
    html += `<tr><td>${u.date}</td><td><strong>${u.siteName}</strong></td><td>${u.numberOfWorkers}</td><td>${progressPill(u.progressPercentage)}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('recentUpdates').innerHTML = html;
}

// ════════════════════════════════════════
// NOTIFICATIONS — sites not updated in 2+ days
// ════════════════════════════════════════
function checkNotifications(data) {
  if (!can.bell) return;
  const now   = new Date();
  const stale = [];

  const siteLatest = {};
  data.forEach(u => {
    if (!siteLatest[u.siteName] || u.date > siteLatest[u.siteName]) {
      siteLatest[u.siteName] = u.date;
    }
  });

  Object.entries(siteLatest).forEach(([site, lastDate]) => {
    const diff = (now - new Date(lastDate)) / (1000 * 60 * 60 * 24);
    if (diff >= 2) stale.push({ site, days: Math.floor(diff) });
  });

  const badge = document.getElementById('bellBadge');
  if (stale.length > 0) {
    badge.textContent = stale.length;
    badge.classList.remove('hidden');
    document.getElementById('notifList').innerHTML =
      stale.map(s => `<div class="notif-item">🏗️ <strong>${s.site}</strong> — ${s.days} days ago</div>`).join('');
  } else {
    badge.classList.add('hidden');
    document.getElementById('notifList').innerHTML = '<div class="notif-item" style="color:var(--text-muted)">✅ All sites up to date</div>';
  }
}

function toggleNotifications() {
  notifsOpen = !notifsOpen;
  document.getElementById('notifPanel').classList.toggle('hidden', !notifsOpen);
}

// Close notif panel when clicking outside
document.addEventListener('click', function(e) {
  if (notifsOpen && !e.target.closest('#notifPanel') && !e.target.closest('#bellBtn')) {
    notifsOpen = false;
    document.getElementById('notifPanel').classList.add('hidden');
  }
});

// ════════════════════════════════════════
// FORM — progress display + form progress bar
// ════════════════════════════════════════
function updateProgressDisplay(val) {
  document.getElementById('progressDisplay').textContent = val + '%';
}

function updateFormProgress() {
  const fields = ['date','siteName','workDone','numberOfWorkers','materialsUsed'];
  const filled  = fields.filter(id => document.getElementById(id).value.trim() !== '').length;
  const pct     = Math.round((filled / fields.length) * 100);
  document.getElementById('formProgressBar').style.width = pct + '%';
}

async function checkDuplicate() {
  const site = document.getElementById('siteName').value.trim();
  const date = document.getElementById('date').value;
  if (!site || !date || editingId) {
    document.getElementById('duplicateWarning').classList.add('hidden');
    return;
  }
  const exists = allUpdates.some(u => u.siteName.toLowerCase() === site.toLowerCase() && u.date === date);
  document.getElementById('duplicateWarning').classList.toggle('hidden', !exists);
}

// ── FORM SUBMIT ──
document.getElementById('updateForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData();
  formData.append('date',               document.getElementById('date').value);
  formData.append('siteName',           document.getElementById('siteName').value.trim());
  formData.append('workDone',           document.getElementById('workDone').value.trim());
  formData.append('numberOfWorkers',    document.getElementById('numberOfWorkers').value);
  formData.append('materialsUsed',      document.getElementById('materialsUsed').value.trim());
  formData.append('progressPercentage', document.getElementById('progressPercentage').value);
  formData.append('submittedBy',        localStorage.getItem('username') || '');
  formData.append('projectId',          currentProjectId);
  formData.append('projectName',        currentProjectName);

  const photo = document.getElementById('photoInput').files[0];
  if (photo) formData.append('photo', photo);

  if (!formData.get('siteName') || !formData.get('workDone') || !formData.get('materialsUsed')) {
    showMessage('formMessage', 'Please fill in all required fields!', 'error');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = editingId ? 'Saving...' : 'Submitting...';

  try {
    const url    = editingId ? projectApi('/update/' + editingId) : '/add-update';
    const method = editingId ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, body: formData });
    const result = await res.json();

    if (res.ok) {
      showMessage('formMessage', result.message, 'success');
      resetForm();
      // Refresh data for charts and stats
      if (can.dashboard) loadDashboard();
    } else {
      showMessage('formMessage', result.message, 'error');
    }
  } catch(err) {
    showMessage('formMessage', 'Could not connect to server.', 'error');
  }

  btn.disabled = false;
  btn.textContent = editingId ? '💾 Save Changes' : '✅ Submit Update';
});

// ── Photo preview ──
function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('previewImg').src = e.target.result;
      document.getElementById('photoPreview').classList.remove('hidden');
    };
    reader.readAsDataURL(input.files[0]);
  }
}
function removePhoto() {
  document.getElementById('photoInput').value = '';
  document.getElementById('photoPreview').classList.add('hidden');
  document.getElementById('previewImg').src = '';
}

// ════════════════════════════════════════
// LOAD ALL UPDATES
// ════════════════════════════════════════
async function loadUpdates() {
  document.getElementById('loadingText').style.display = 'block';
  document.getElementById('updatesContainer').innerHTML = '';
  document.getElementById('resultsCount').textContent   = 'Loading...';

  try {
    const res = await fetch(projectApi('/updates'));
    let   data = await res.json();

    // Builder sees only their own submissions
    if (!can.viewAll) {
      const me = localStorage.getItem('username');
      data = data.filter(u => u.submittedBy === me);
    }

    allUpdates      = data;
    filteredUpdates = data.slice();

    document.getElementById('loadingText').style.display = 'none';

    if (data.length === 0) {
      document.getElementById('updatesContainer').innerHTML = '<p class="empty-state">No updates found.</p>';
      document.getElementById('resultsCount').textContent = '0 results';
      return;
    }

    renderTable();

  } catch(err) {
    document.getElementById('loadingText').textContent = 'Failed to load. Is the server running?';
  }
}

// ── FILTERS ──
function applyFilters() {
  const search  = document.getElementById('searchSite').value.toLowerCase().trim();
  const from    = document.getElementById('fromDate').value;
  const to      = document.getElementById('toDate').value;
  const minProg = parseInt(document.getElementById('minProgress').value) || 0;

  filteredUpdates = allUpdates.filter(u => {
    const matchSite  = u.siteName.toLowerCase().includes(search);
    const matchFrom  = from ? u.date >= from : true;
    const matchTo    = to   ? u.date <= to   : true;
    const matchProg  = u.progressPercentage >= minProg;
    return matchSite && matchFrom && matchTo && matchProg;
  });

  renderTable();
}

function clearFilters() {
  ['searchSite','fromDate','toDate','minProgress'].forEach(id => document.getElementById(id).value = '');
  filteredUpdates = allUpdates.slice();
  renderTable();
}

// ── RENDER TABLE ──
function renderTable() {
  const container  = document.getElementById('updatesContainer');
  const showDelete = can.delete && currentTab === 'manage';
  const showEdit   = can.edit   && currentTab === 'manage';

  document.getElementById('resultsCount').textContent =
    filteredUpdates.length + ' of ' + allUpdates.length + ' results';

  if (filteredUpdates.length === 0) {
    container.innerHTML = '<p class="empty-state">No results match your filters.</p>';
    return;
  }

  let html = '<table><thead><tr>';
  html += '<th>#</th><th>Date</th><th>Site</th><th>Work Done</th><th>Workers</th><th>Materials</th><th>Progress</th><th>Photo</th>';
  if (showEdit || showDelete) html += '<th>Actions</th>';
  html += '</tr></thead><tbody>';

  filteredUpdates.forEach((u, i) => {
    html += '<tr>';
    html += `<td style="color:var(--text-muted)">${i+1}</td>`;
    html += `<td style="white-space:nowrap">${u.date}</td>`;
    html += `<td><strong>${u.siteName}</strong></td>`;
    html += `<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${u.workDone}">${u.workDone}</td>`;
    html += `<td style="text-align:center">${u.numberOfWorkers}</td>`;
    html += `<td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.materialsUsed}</td>`;
    html += `<td>${progressPill(u.progressPercentage)}</td>`;
    html += u.photoPath
      ? `<td><img class="thumb" src="${u.photoPath}" onclick="openLightbox('${u.photoPath}')"/></td>`
      : `<td><span class="no-photo">—</span></td>`;
    if (showEdit || showDelete) {
      html += '<td style="white-space:nowrap;display:flex;gap:5px">';
      if (showEdit)   html += `<button class="btn-edit"   onclick="startEdit('${u._id}')">✏️ Edit</button>`;
      if (showDelete) html += `<button class="btn btn-danger" onclick="deleteUpdate('${u._id}')">🗑️</button>`;
      html += '</td>';
    }
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function progressPill(pct) {
  const cls = pct >= 100 ? 'pill-done' : pct >= 60 ? 'pill-high' : pct >= 30 ? 'pill-mid' : 'pill-low';
  return `<span class="progress-pill ${cls}">${pct}%</span>`;
}

// ── SWITCH TAB ──
function switchTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (filteredUpdates.length > 0) renderTable();
}

// ── EDIT ──
function startEdit(id) {
  const record = allUpdates.find(u => u._id === id);
  if (!record) return;

  document.getElementById('date').value               = record.date;
  document.getElementById('siteName').value           = record.siteName;
  document.getElementById('workDone').value           = record.workDone;
  document.getElementById('numberOfWorkers').value    = record.numberOfWorkers;
  document.getElementById('progressPercentage').value = record.progressPercentage;
  document.getElementById('materialsUsed').value      = record.materialsUsed;
  updateProgressDisplay(record.progressPercentage);

  editingId = id;
  document.getElementById('formTitle').textContent  = '✏️ Edit Update';
  document.getElementById('submitBtn').textContent  = '💾 Save Changes';
  document.getElementById('editBanner').classList.remove('hidden');

  showSection('submit');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() { resetForm(); }

function resetForm() {
  document.getElementById('updateForm').reset();
  removePhoto();
  editingId = null;
  document.getElementById('formTitle').textContent  = '📝 Submit Daily Update';
  document.getElementById('submitBtn').textContent  = '✅ Submit Update';
  document.getElementById('editBanner').classList.add('hidden');
  document.getElementById('duplicateWarning').classList.add('hidden');
  document.getElementById('formProgressBar').style.width = '0%';
  updateProgressDisplay(0);
  document.getElementById('date').value = new Date().toISOString().split('T')[0];
}

// ── DELETE ──
async function deleteUpdate(id) {
  if (!confirm('Permanently delete this update?')) return;
  try {
    const res    = await fetch(projectApi('/update/' + id), { method: 'DELETE' });
    const result = await res.json();
    alert(result.message);
    loadUpdates();
    if (can.dashboard) loadDashboard();
  } catch(e) { alert('Could not delete.'); }
}

// ════════════════════════════════════════
// SITE PROGRESS
// ════════════════════════════════════════
async function loadSiteProgress() {
  document.getElementById('sitesLoadingText').style.display = 'block';
  document.getElementById('sitesContainer').innerHTML = '';

  try {
    const res   = await fetch(projectApi('/site-progress'));
    const sites = await res.json();
    document.getElementById('sitesLoadingText').style.display = 'none';

    if (!sites.length) {
      document.getElementById('sitesContainer').innerHTML = '<p class="empty-state">No site data yet.</p>';
      return;
    }

    let html = '<div class="sites-grid">';
    sites.forEach((s, i) => {
      const pct  = s.progressPercentage;
      const done = pct >= 100;
      html += `<div class="site-card" style="animation-delay:${i*0.05}s">
        <div class="site-card-name">🏗️ ${s.siteName}</div>
        <div class="site-card-date">Last updated: ${s.date}</div>
        <div class="site-card-workers">👷 ${s.numberOfWorkers} workers on last log</div>
        <div class="site-progress-label"><span>Progress</span><span>${pct}%</span></div>
        <div class="site-bar-wrap">
          <div class="site-bar-fill ${done?'done':''}" style="width:${pct}%"></div>
        </div>
        ${done ? '<p style="margin-top:8px;font-size:0.75rem;color:var(--green);font-weight:600">✅ Completed</p>' : ''}
      </div>`;
    });
    html += '</div>';
    document.getElementById('sitesContainer').innerHTML = html;

  } catch(e) {
    document.getElementById('sitesLoadingText').textContent = 'Could not load site data.';
  }
}

// ════════════════════════════════════════
// LIGHTBOX
// ════════════════════════════════════════
function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.remove('hidden');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
}

// ════════════════════════════════════════
// CSV EXPORT
// ════════════════════════════════════════
async function exportCSV() {
  try {
    const res  = await fetch(projectApi('/updates'));
    const data = await res.json();

    const headers = ['Date','Site Name','Work Done','Workers','Materials','Progress %','Submitted By'];
    const rows    = data.map(u => [
      u.date, u.siteName,
      '"' + (u.workDone || '').replace(/"/g, '""') + '"',
      u.numberOfWorkers,
      '"' + (u.materialsUsed || '').replace(/"/g, '""') + '"',
      u.progressPercentage,
      u.submittedBy || ''
    ]);

    const csv     = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = 'construction-updates-' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);

  } catch(e) { alert('Could not export CSV.'); }
}

// ════════════════════════════════════════
// PRINT REPORT
// ════════════════════════════════════════
async function printReport() {
  try {
    const res  = await fetch(projectApi('/updates'));
    const data = await res.json();

    const rows = data.map((u, i) =>
      `<tr><td>${i+1}</td><td>${u.date}</td><td>${u.siteName}</td><td>${u.workDone}</td><td>${u.numberOfWorkers}</td><td>${u.materialsUsed}</td><td>${u.progressPercentage}%</td></tr>`
    ).join('');

    document.getElementById('printArea').innerHTML = `
      <h1>Construction Site Progress Report</h1>
      <p>Generated: ${new Date().toLocaleDateString()} &nbsp;|&nbsp; Total records: ${data.length}</p>
      <table>
        <thead><tr><th>#</th><th>Date</th><th>Site</th><th>Work Done</th><th>Workers</th><th>Materials</th><th>Progress</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    window.print();

  } catch(e) { alert('Could not generate report.'); }
}

// ── SHOW MESSAGE ──
async function loadProjectUsers() {
  const container = document.getElementById('projectUsersList');
  if (!container || currentRole !== 'admin') return;

  container.innerHTML = '<p class="loading-text">Loading accounts...</p>';

  try {
    const res = await fetch(projectApi('/project-users'));
    const users = await res.json();
    if (!res.ok) throw new Error(users.message || 'Could not load accounts.');

    const roleOrder = { builder: 1, manager: 2, admin: 3 };
    users.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

    if (!users.length) {
      container.innerHTML = '<p class="empty-state">No accounts registered for this project.</p>';
      return;
    }

    container.innerHTML = users.map(user => {
      const displayName = user.fullName || user.username;
      return `<div class="cred-row ${user.role}-cred">
        <span class="cred-role">${user.role}</span>
        <code>${user.username}</code>
        <span style="color:var(--text-muted);font-size:0.82rem">${displayName}</span>
      </div>`;
    }).join('');
  } catch (error) {
    container.innerHTML = '<p class="empty-state">Could not load project accounts.</p>';
  }
}

function showMessage(id, text, type) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'message ' + type;
  setTimeout(() => el.className = 'message hidden', 4000);
}
