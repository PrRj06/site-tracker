const ROLE_DESCRIPTIONS = {
  builder: 'Log daily work, materials, and on-site progress',
  manager: 'Review all sites, monitor progress, and generate reports',
  admin: 'Control accounts, records, and project administration'
};

const ROLE_STRIP_COLORS = {
  builder: '#F59E0B',
  manager: '#22C55E',
  admin: '#A855F7'
};

let selectedRole = 'builder';

const modeLogin = document.getElementById('modeLogin');
const modeProject = document.getElementById('modeProject');
const loginPane = document.getElementById('loginPane');
const projectPane = document.getElementById('projectPane');
const projectSelect = document.getElementById('projectSelect');

function switchMode(mode) {
  const isProject = mode === 'project';
  modeLogin.classList.toggle('active', !isProject);
  modeProject.classList.toggle('active', isProject);
  loginPane.classList.toggle('hidden', isProject);
  projectPane.classList.toggle('hidden', !isProject);
  clearMessages();
}

function switchRole(role) {
  selectedRole = role;

  ['builder','manager','admin'].forEach(r => {
    document.getElementById('tab-' + r).classList.toggle('active', r === role);
  });

  document.getElementById('roleStripText').textContent = ROLE_DESCRIPTIONS[role];
  const strip = document.getElementById('roleStrip');
  const color = ROLE_STRIP_COLORS[role];
  strip.style.borderLeftColor = color;
  strip.style.background = color + '14';

  ['builder','manager','admin'].forEach(r => {
    const card = document.getElementById('preview-' + r);
    if (card) card.style.borderColor = r === role ? color : 'rgba(255,255,255,0.07)';
  });

  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('loginMessage').className = 'login-msg hidden';
}

async function loadProjects(selectedId) {
  projectSelect.innerHTML = '<option value="">Loading projects...</option>';
  try {
    const res = await fetch('/projects');
    const projects = await res.json();

    if (!res.ok) throw new Error(projects.message || 'Could not load projects.');

    if (!projects.length) {
      projectSelect.innerHTML = '<option value="">Create a project first</option>';
      return;
    }

    projectSelect.innerHTML = '<option value="">Select project</option>' +
      projects.map(project => {
        const label = `${project.name} (${project.code})`;
        return `<option value="${project._id}">${label}</option>`;
      }).join('');

    if (selectedId) projectSelect.value = selectedId;
  } catch (error) {
    projectSelect.innerHTML = '<option value="">Projects unavailable</option>';
    showMsg('Could not load projects. Check the server connection.', 'error');
  }
}

function selectedProjectName() {
  const option = projectSelect.options[projectSelect.selectedIndex];
  return option ? option.textContent : '';
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const projectId = projectSelect.value;
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!projectId || !username || !password) {
    showMsg('Select a project and enter username and password.', 'error');
    return;
  }

  const btn = document.getElementById('loginBtn');
  const text = document.getElementById('btnText');
  const loader = document.getElementById('btnLoader');

  text.textContent = 'Signing in...';
  loader.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, role: selectedRole, username, password })
    });
    const result = await res.json();

    if (res.ok) {
      localStorage.setItem('role', result.role);
      localStorage.setItem('username', result.user.username);
      localStorage.setItem('projectId', result.project._id);
      localStorage.setItem('projectName', result.project.name);
      localStorage.setItem('projectCode', result.project.code);
      showMsg('Login successful. Opening dashboard...', 'success');
      setTimeout(() => window.location.href = '/index.html', 700);
    } else {
      showMsg(result.message, 'error');
    }
  } catch(err) {
    showMsg('Cannot connect to server.', 'error');
  }

  text.textContent = 'Sign in';
  loader.classList.add('hidden');
  btn.disabled = false;
});

document.getElementById('projectForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const payload = {
    projectName: valueOf('projectName'),
    projectCode: valueOf('projectCode'),
    location: valueOf('projectLocation'),
    users: {
      admin: {
        fullName: valueOf('adminName'),
        username: valueOf('adminUsername'),
        password: valueOf('adminPassword')
      },
      manager: {
        fullName: valueOf('managerName'),
        username: valueOf('managerUsername'),
        password: valueOf('managerPassword')
      },
      builder: {
        fullName: valueOf('builderName'),
        username: valueOf('builderUsername'),
        password: valueOf('builderPassword')
      }
    }
  };

  const usernames = ['adminUsername', 'managerUsername', 'builderUsername'].map(valueOf);
  if (new Set(usernames.map(name => name.toLowerCase())).size !== usernames.length) {
    showProjectMsg('Use a different username for each role.', 'error');
    return;
  }

  const btn = document.getElementById('projectBtn');
  const text = document.getElementById('projectBtnText');
  const loader = document.getElementById('projectBtnLoader');

  text.textContent = 'Creating project...';
  loader.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res = await fetch('/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (res.ok) {
      document.getElementById('projectForm').reset();
      await loadProjects(result.project._id);
      switchMode('login');
      switchRole('admin');
      showMsg('Project created. Sign in with one of the registered accounts.', 'success');
      document.getElementById('username').value = result.users.find(user => user.role === 'admin').username;
      document.getElementById('password').focus();
    } else {
      showProjectMsg(result.message, 'error');
    }
  } catch(err) {
    showProjectMsg('Cannot connect to server.', 'error');
  }

  text.textContent = 'Create project';
  loader.classList.add('hidden');
  btn.disabled = false;
});

function valueOf(id) {
  return document.getElementById(id).value.trim();
}

function showMsg(text, type) {
  const el = document.getElementById('loginMessage');
  el.textContent = text;
  el.className = 'login-msg ' + type;
}

function showProjectMsg(text, type) {
  const el = document.getElementById('projectMessage');
  el.textContent = text;
  el.className = 'login-msg ' + type;
}

function clearMessages() {
  document.getElementById('loginMessage').className = 'login-msg hidden';
  document.getElementById('projectMessage').className = 'login-msg hidden';
}

modeLogin.addEventListener('click', () => switchMode('login'));
modeProject.addEventListener('click', () => switchMode('project'));

const params = new URLSearchParams(window.location.search);
if (params.get('mode') === 'project') switchMode('project');

loadProjects();
switchRole('builder');
