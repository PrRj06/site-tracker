function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function normalizeProjectCode(value, name) {
  const source = String(value || name || 'project').trim();
  const base = source
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 18)
    .toUpperCase() || 'PROJECT';

  return value ? base : `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function projectDTO(project) {
  return {
    _id: project._id,
    name: project.name,
    code: project.code,
    location: project.location,
    status: project.status
  };
}

function userDTO(user) {
  return {
    fullName: user.fullName,
    username: user.username,
    role: user.role
  };
}

function validateAccount(role, account) {
  const username = normalizeUsername(account && account.username);
  const password = String((account && account.password) || '');

  if (!username || !password) return `${role} username and password are required.`;
  if (password.length < 4) return `${role} password must be at least 4 characters.`;

  return '';
}

module.exports = {
  normalizeUsername,
  normalizeProjectCode,
  projectDTO,
  userDTO,
  validateAccount
};
