const savedRole = localStorage.getItem('role');
const primaryCta = document.getElementById('primaryCta');
const bottomCta = document.getElementById('bottomCta');
const navLogin = document.getElementById('navLogin');
const navProject = document.getElementById('navProject');
const setupCta = document.getElementById('setupCta');

if (savedRole) {
  primaryCta.textContent = 'Open dashboard';
  primaryCta.href = '/index.html';
  bottomCta.textContent = 'Open dashboard';
  bottomCta.href = '/index.html';
  navLogin.textContent = 'Dashboard';
  navLogin.href = '/index.html';
  if (navProject) navProject.style.display = 'none';
  if (setupCta) setupCta.textContent = 'Project features';
  if (setupCta) setupCta.href = '#features';
}
