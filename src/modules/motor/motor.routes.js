// src/modules/motor/motor.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const motorController = require('./motor.controller');

// motor.routes.js is inside src/modules/motor → go up 3 levels: motor → modules → src → root
const projectRoot = path.join(__dirname, '..', '..', '..');

// --- Multer config: jpg/png only + keep extension ---
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(projectRoot, 'uploads', 'motor')); // root/uploads/motor
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueName}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowedMimeTypes = ['image/jpeg', 'image/png'];
  const allowedExt = ['.jpg', '.jpeg', '.png'];

  const mimeValid = allowedMimeTypes.includes(file.mimetype);
  const extValid = allowedExt.includes(path.extname(file.originalname).toLowerCase());

  if (!mimeValid || !extValid) {
    return cb(httpError(400, 'Only JPG and PNG image files are allowed'), false);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
});

// POST /api/motor/calculate-premium
router.post('/calculate-premium', motorController.calculatePremium);

// POST /api/motor/market-value
router.post('/market-value', motorController.getMarketValue);

// POST /api/motor/submit-proposal (no images)
router.post('/submit-proposal', motorController.submitProposal);

// POST /api/motor/:proposalId/uploads?step=cnic|license|regbook|vehicle
router.post(
  '/:proposalId/uploads',
  (req, res, next) => {
    const step = String(req.query.step || '').toLowerCase();

    if (!step) {
      return next(Object.assign(new Error('step is required (cnic|license|regbook|vehicle)'), { status: 400 }));
    }

    if (step === 'cnic') {
      return upload.fields([
        { name: 'cnic_front', maxCount: 1 },
        { name: 'cnic_back', maxCount: 1 },
      ])(req, res, next);
    }

    if (step === 'license') {
      return upload.fields([
        { name: 'license_front', maxCount: 1 },
        { name: 'license_back', maxCount: 1 },
      ])(req, res, next);
    }

    if (step === 'regbook') {
      // ONLY regbook images here
      return upload.fields([
        { name: 'regbook_front', maxCount: 1 },
        { name: 'regbook_back', maxCount: 1 },
      ])(req, res, next);
    }

    if (step === 'vehicle') {
      // ONLY vehicle images here
      return upload.fields([
        { name: 'front_side', maxCount: 1 },
        { name: 'back_side', maxCount: 1 },
        { name: 'right_side', maxCount: 1 },
        { name: 'left_side', maxCount: 1 },
        { name: 'dashboard', maxCount: 1 },
        { name: 'engine_bay', maxCount: 1 },
        { name: 'boot', maxCount: 1 },
        { name: 'engine_number', maxCount: 1 },
      ])(req, res, next);
    }

    return next(Object.assign(new Error('Invalid step. Use: cnic, license, regbook, vehicle'), { status: 400 }));
  },
  motorController.uploadMotorAssets
);

// POST /api/motor/:proposalId/reuploads?
router.post(
  '/:proposalId/reupload',
  (req, res, next) => {
    return upload.fields([
      // docs
      { name: 'cnic_front', maxCount: 1 },
      { name: 'cnic_back', maxCount: 1 },
      { name: 'license_front', maxCount: 1 },
      { name: 'license_back', maxCount: 1 },
      { name: 'regbook_front', maxCount: 1 },
      { name: 'regbook_back', maxCount: 1 },

      // vehicle images
      { name: 'front_side', maxCount: 1 },
      { name: 'back_side', maxCount: 1 },
      { name: 'right_side', maxCount: 1 },
      { name: 'left_side', maxCount: 1 },
      { name: 'dashboard', maxCount: 1 },
      { name: 'engine_bay', maxCount: 1 },
      { name: 'boot', maxCount: 1 },
      { name: 'engine_number', maxCount: 1 },
    ])(req, res, next);
  },
  motorController.reuploadMotorAssets
);

// GET /api/motor/my-proposals/:id
router.get('/my-proposals/:id', motorController.getMyProposalById);

// PATCH /api/motor/my-proposals/:id/registration-number
router.patch('/my-proposals/:id/registration-number', motorController.updateRegistrationNumber);

module.exports = router;
