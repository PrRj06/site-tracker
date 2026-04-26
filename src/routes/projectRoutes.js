const express = require('express');
const {
  getProjects,
  createProject,
  getProjectUsers
} = require('../controllers/projectController');

const router = express.Router();

router.get('/projects', getProjects);
router.post('/projects', createProject);
router.get('/project-users', getProjectUsers);

module.exports = router;
