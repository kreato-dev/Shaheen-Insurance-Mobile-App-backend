const path = require('path');
const fs = require('fs');
const multer = require('multer');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'policies');
ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || '.pdf').toLowerCase();
    const safeExt = ext === '.pdf' ? '.pdf' : '.pdf';
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  // strict PDF only
  const isPdf =
    file.mimetype === 'application/pdf' ||
    (file.originalname || '').toLowerCase().endsWith('.pdf');

  if (!isPdf) return cb(new Error('Only PDF files are allowed (application/pdf).'));
  cb(null, true);
}

const uploadPolicyDocs = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (change if you want)
    files: 2,
  },
}).fields([
  { name: 'policy_pdf', maxCount: 1 },
  { name: 'schedule_pdf', maxCount: 1 },
]);

module.exports = {
  uploadPolicyDocs,
  UPLOAD_DIR,
};
