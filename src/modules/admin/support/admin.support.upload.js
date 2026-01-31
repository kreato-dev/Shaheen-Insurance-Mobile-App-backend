const multer = require('multer');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..', '..', '..', '..');
const uploadDir = path.join(projectRoot, 'uploads', 'support');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

module.exports = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
