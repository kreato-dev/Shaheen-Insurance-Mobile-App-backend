const path = require('path');
const fs = require('fs');
const multer = require('multer');

// admin.policy.upload.js is inside src/modules/admin/policies → go up 4 levels: policies → admin → modules → src → root
const projectRoot = path.join(__dirname, '..', '..', '..', '..');

const UPLOAD_DIR = path.join(projectRoot, 'uploads', 'policies');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}
ensureDir(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const original = (file.originalname || '').toLowerCase();
    const ext = path.extname(original) || '';
    const allowed = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
    const safeExt = allowed.has(ext) ? ext : '.pdf';

    cb(null, `policy_schedule-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const name = (file.originalname || '').toLowerCase();

  const ok =
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    name.endsWith('.pdf') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png');

  if (!ok) return cb(new Error('Only PDF/JPG/PNG files are allowed.'));
  cb(null, true);
}

const uploadPolicySchedule = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
}).fields([{ name: 'policy_schedule', maxCount: 1 }]);

module.exports = {
  uploadPolicySchedule,
  UPLOAD_DIR,
};
