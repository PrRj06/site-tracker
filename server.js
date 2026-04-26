const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const Project = require('./models/Project');

const app = express();
const PORT = process.env.PORT || 4001;
const VALID_ROLES = ['builder', 'manager', 'admin'];
const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, 'public/uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
});

const fileFilter = (req, file, cb) =>
  file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'), false);

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
app.locals.upload = upload;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
app.use(express.static(path.join(__dirname, 'public')));
if (isVercel) {
  // Vercel's filesystem is read-only except /tmp.
  app.use('/uploads', express.static(uploadDir));
}

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

app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find({ status: 'active' }).sort({ createdAt: -1 });
    res.status(200).json(projects.map(projectDTO));
  } catch (error) {
    res.status(500).json({ message: 'Could not load projects.' });
  }
});

app.post('/projects', async (req, res) => {
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
});

app.post('/login', async (req, res) => {
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
});

app.get('/project-users', async (req, res) => {
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
});

const mongoUri = process.env.MONGODB_URI;
let mongoConnectPromise;

function connectToMongo() {
  if (!mongoUri) {
    console.error('Missing MONGODB_URI environment variable.');
    return Promise.resolve();
  }

  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(mongoUri)
      .then(() => console.log('MongoDB connected.'))
      .catch(err => {
        console.error('MongoDB error:', err.message);
        mongoConnectPromise = null;
      });
  }

  return mongoConnectPromise;
}

connectToMongo();

const updateRoutes = require('./routes/updates');
app.use('/', updateRoutes);

if (require.main === module) {
  app.listen(PORT, () => console.log(`Running at http://localhost:${PORT}`));
}

module.exports = app;
