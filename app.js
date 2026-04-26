require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createUploadMiddleware } = require('./src/config/upload');
const projectRoutes = require('./src/routes/projectRoutes');
const authRoutes = require('./src/routes/authRoutes');
const updateRoutes = require('./src/routes/updateRoutes');

function createApp(options = {}) {
  const isVercel = options.isVercel === true;
  const app = express();

  const { upload, uploadDir } = createUploadMiddleware(__dirname, isVercel);
  app.locals.upload = upload;

  app.use(express.json());
  app.use(cors());

  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));
  app.use(express.static(path.join(__dirname, 'public')));

  if (isVercel) {
    // Vercel's filesystem is read-only except /tmp.
    app.use('/uploads', express.static(uploadDir));
  }

  app.use('/', projectRoutes);
  app.use('/', authRoutes);
  app.use('/', updateRoutes);

  return app;
}

module.exports = {
  createApp
};
