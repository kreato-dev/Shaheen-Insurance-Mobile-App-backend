// src/modules/travel/travel.routes.js
const express = require('express');
const router = express.Router();
const travelController = require('./travel.controller');

// POST /api/travel/calculate-premium
router.post('/calculate-premium', travelController.calculatePremium);

// POST /api/travel/submit-proposal
router.post('/submit-proposal', travelController.submitProposal);

module.exports = router;
