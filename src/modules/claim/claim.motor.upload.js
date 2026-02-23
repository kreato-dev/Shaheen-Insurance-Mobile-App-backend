const path = require('path');
const multer = require('multer');

// src/modules/claims/motor -> go up 4 levels to project root
const projectRoot = path.join(__dirname, '..', '..', '..' );

const UPLOAD_DIR = path.join(projectRoot, 'uploads', 'claims', 'motor');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const original = (file.originalname || '').toLowerCase();
    const ext = path.extname(original) || '';
    const allowed = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.mp3', '.wav', '.m4a']);
    const safeExt = allowed.has(ext) ? ext : '.jpg';
    cb(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  const name = (file.originalname || '').toLowerCase();
  const ok =
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype.startsWith('audio/') ||
    name.endsWith('.pdf') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.mp3') ||
    name.endsWith('.wav') ||
    name.endsWith('.m4a');

  if (!ok) return cb(new Error('Only PDF/JPG/PNG or Audio files are allowed.'));
  cb(null, true);
}

const uploadClaimEvidence = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 7 },
}).fields([
  { name: 'vehicle_front', maxCount: 1 },
  { name: 'vehicle_back', maxCount: 1 },
  { name: 'vehicle_left', maxCount: 1 },
  { name: 'vehicle_right', maxCount: 1 },
  { name: 'vehicle_damaged', maxCount: 1 },
  { name: 'police_report', maxCount: 1 }, // optional
  { name: 'voice_note', maxCount: 1 }, // optional
]);

module.exports = { uploadClaimEvidence, UPLOAD_DIR };
