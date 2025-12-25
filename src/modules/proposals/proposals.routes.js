// src/modules/proposals/proposals.routes.js
const express = require('express');
const router = express.Router();
const proposalsController = require('./proposals.controller');

// GET /api/proposals/my
router.get('/my', proposalsController.getMyProposalsFeed);

module.exports = router;
