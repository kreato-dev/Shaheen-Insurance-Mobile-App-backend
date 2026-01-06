const path = require('path');
const multer = require('multer');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..', '..', '..', '..'); 

const UPLOAD_DIR = path.join(projectRoot, 'uploads', 'refunds');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `refund-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  // allow images + pdf
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only PNG/JPG/PDF allowed'));
  }
  cb(null, true);
}

const uploadRefundEvidence = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = { uploadRefundEvidence };