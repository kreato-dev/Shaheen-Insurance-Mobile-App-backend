// src/modules/travel/travel.routes.js
const express = require('express');
const router = express.Router();
const travelController = require('./travel.controller');
const { getTravelDestinations } = require('./travel.destination.controller');

// POST /api/travel/calculate-premium
router.post('/calculate-premium', travelController.calculatePremium);

// POST /api/travel/submit-proposal
router.post('/submit-proposal', travelController.submitProposal);

// GET /api/travel/destinations
router.get('/destinations', getTravelDestinations);

module.exports = router;
