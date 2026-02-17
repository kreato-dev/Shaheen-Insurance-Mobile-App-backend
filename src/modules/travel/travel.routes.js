// src/modules/travel/travel.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const travelController = require('./travel.controller');

// travel.routes.js is inside src/modules/travel → go up 3 levels: travel → modules → src → root
const projectRoot = path.join(__dirname, '..', '..', '..');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// --- Multer config: jpg/png only + keep extension ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(projectRoot, 'uploads', 'travel')); // root/uploads/travel
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

// POST /api/travel/quote-premium
router.post('/quote-premium', travelController.quotePremium);

// POST /api/travel/submit-proposal
router.post('/submit-proposal', travelController.submitProposal);

// POST /api/travel/:packageCode/:proposalId/uploads?step=identity|ticket|kyc
router.post(
  '/:packageCode/:proposalId/uploads',
  (req, res, next) => {
    const step = String(req.query.step || '').toLowerCase();

    if (!step) {
      return next(
        Object.assign(
          new Error('step is required (identity|ticket|kyc)'),
          { status: 400 }
        )
      );
    }

    // STEP 1: Identity
    // CNIC (front + back) OR Passport (single)
    if (step === 'identity') {
      return upload.fields([
        { name: 'cnic_front', maxCount: 1 },
        { name: 'cnic_back', maxCount: 1 },
        { name: 'passport_image', maxCount: 1 },
      ])(req, res, next);
    }

    // STEP 2: Ticket (optional)
    if (step === 'ticket') {
      return upload.fields([
        { name: 'ticket_image', maxCount: 1 },
      ])(req, res, next);
    }

    // STEP 3: KYC (Employment / Visiting Card)
    // Optional overall, but if step=kyc then file is required
    if (step === 'kyc') {
      return upload.fields([
        { name: 'employment_proof', maxCount: 1 },
        { name: 'source_of_income_proof', maxCount: 1 },
      ])(req, res, next);
    }

    return next(
      Object.assign(
        new Error('Invalid step. Use: identity, ticket, kyc'),
        { status: 400 }
      )
    );
  },
  travelController.uploadTravelAssets
);

// POST /api/travel/:packageCode/:proposalId/reupload
router.post(
  '/:packageCode/:proposalId/reupload',
  (req, res, next) => {
    return upload.fields([
      { name: 'cnic_front', maxCount: 1 },
      { name: 'cnic_back', maxCount: 1 },
      { name: 'passport_image', maxCount: 1 },
      { name: 'ticket_image', maxCount: 1 },
      { name: 'employment_proof', maxCount: 1 },
      { name: 'source_of_income_proof', maxCount: 1 },
    ])(req, res, next);
  },
  travelController.reuploadTravelAssets
);

/*
*Get travel proposal by id
*/
// GET /api/travel/my-proposals/{proposalId}?package={packageCode}
router.get('/my-proposals/:id', travelController.getMyProposalById);

module.exports = router;