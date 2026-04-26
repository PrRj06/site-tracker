const mongoose = require('mongoose');

function getProjectId(req) {
  return req.body.projectId || req.query.projectId;
}

function requireProjectId(req, res) {
  const projectId = getProjectId(req);

  if (!mongoose.isValidObjectId(projectId)) {
    res.status(400).json({ message: 'Project is required.' });
    return null;
  }

  return projectId;
}

module.exports = {
  getProjectId,
  requireProjectId
};
