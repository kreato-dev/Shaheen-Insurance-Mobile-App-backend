// src/modules/travel/travel.routes.js
const express = require('express');
const router = express.Router();
const travelController = require('./travel.controller');

// POST /api/travel/quote-premium
router.post('/quote-premium', travelController.quotePremium);

// POST /api/travel/submit-proposal
router.post('/submit-proposal', travelController.submitProposal);

// Catalog (no auth needed usually, but up to you)
router.get('/catalog/packages', travelController.listPackages);
router.get('/catalog/coverages', travelController.listCoverages);
router.get('/catalog/plans', travelController.listPlans);
router.get('/catalog/slabs', travelController.listSlabs);

module.exports = router;