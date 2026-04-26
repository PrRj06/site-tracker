const mongoose = require('mongoose');
const Project = require('../../models/Project');
const { VALID_ROLES } = require('../config/constants');
const { normalizeUsername, projectDTO, userDTO } = require('../utils/projectUtils');

async function login(req, res) {
  try {
    const { projectId, role, username, password } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Please select a valid project.' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const project = await Project.findOne({ _id: projectId, status: 'active' });
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const user = project.users.find(account =>
      account.role === role &&
      account.username === normalizeUsername(username) &&
      account.password === String(password || '')
    );

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password for this project.' });
    }

    res.status(200).json({
      message: 'Login successful!',
      role: user.role,
      user: userDTO(user),
      project: projectDTO(project)
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not sign in.' });
  }
}

module.exports = {
  login
};
