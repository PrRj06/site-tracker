const mongoose = require('mongoose');
const Project = require('../../models/Project');
const { VALID_ROLES } = require('../config/constants');
const {
  normalizeUsername,
  normalizeProjectCode,
  projectDTO,
  userDTO,
  validateAccount
} = require('../utils/projectUtils');

async function getProjects(req, res) {
  try {
    const projects = await Project.find({ status: 'active' }).sort({ createdAt: -1 });
    res.status(200).json(projects.map(projectDTO));
  } catch (error) {
    res.status(500).json({ message: 'Could not load projects.' });
  }
}

async function createProject(req, res) {
  try {
    const { projectName, projectCode, location, users = {} } = req.body;
    const name = String(projectName || '').trim();

    if (!name) return res.status(400).json({ message: 'Project name is required.' });

    for (const role of VALID_ROLES) {
      const accountError = validateAccount(role, users[role]);
      if (accountError) return res.status(400).json({ message: accountError });
    }

    const usernames = VALID_ROLES.map(role => normalizeUsername(users[role].username));
    if (new Set(usernames).size !== usernames.length) {
      return res.status(400).json({ message: 'Each project account needs a unique username.' });
    }

    const createdUsers = VALID_ROLES.map(role => ({
      fullName: String(users[role].fullName || '').trim(),
      username: normalizeUsername(users[role].username),
      password: String(users[role].password),
      role
    }));

    const project = new Project({
      name,
      code: normalizeProjectCode(projectCode, name),
      location: String(location || '').trim(),
      users: createdUsers
    });

    await project.save();

    res.status(201).json({
      message: 'Project created successfully.',
      project: projectDTO(project),
      users: createdUsers.map(userDTO)
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: 'That project code is already in use.' });
    }
    res.status(500).json({ message: 'Could not create project.' });
  }
}

async function getProjectUsers(req, res) {
  try {
    const { projectId } = req.query;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Project is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const users = project.users
      .map(userDTO)
      .sort((a, b) => a.role.localeCompare(b.role) || a.username.localeCompare(b.username));

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Could not load project users.' });
  }
}

module.exports = {
  getProjects,
  createProject,
  getProjectUsers
};
