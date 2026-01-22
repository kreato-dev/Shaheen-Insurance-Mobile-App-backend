const path = require('path');
const multer = require('multer');

// src/modules/admin/policies -> go up 4 levels to project root
const projectRoot = path.join(__dirname, '..', '..', '..', '..');

const UPLOAD_DIR = path.join(projectRoot, 'uploads', 'renewals');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR); // root/uploads/renewals
  },
  filename: function (req, file, cb) {
    const original = (file.originalname || '').toLowerCase();
    const ext = path.extname(original) || '';
    const allowed = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
    const safeExt = allowed.has(ext) ? ext : '.pdf';

    cb(null, `renewal-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
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

const uploadRenewalDoc = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
}).fields([{ name: 'renewal_document', maxCount: 1 }]);

module.exports = {
  uploadRenewalDoc,
  UPLOAD_DIR,
};
