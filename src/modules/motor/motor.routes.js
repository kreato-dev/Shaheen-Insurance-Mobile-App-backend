// src/modules/motor/motor.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const motorController = require('./motor.controller');

const upload = multer({ dest: 'uploads/motor/' });

// POST /api/motor/calculate-premium
router.post('/calculate-premium', motorController.calculatePremium);

// POST /api/motor/market-value
router.post('/market-value', motorController.getMarketValue);

// POST /api/motor/submit-proposal
router.post(
  '/submit-proposal',
  upload.array('images'),
  motorController.submitProposal
);

module.exports = router;
