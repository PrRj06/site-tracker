const fs = require('fs');
const path = require('path');
const multer = require('multer');

function createUploadMiddleware(rootDir, isVercel) {
  const uploadDir = isVercel
    ? path.join('/tmp', 'uploads')
    : path.join(rootDir, 'public/uploads');

  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
  });

  const fileFilter = (req, file, cb) =>
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'), false);

  const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  });

  return { upload, uploadDir };
}

module.exports = {
  createUploadMiddleware
};
