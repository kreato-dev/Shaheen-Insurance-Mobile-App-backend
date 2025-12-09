// src/modules/claim/claim.routes.js
const express = require('express');
const router = express.Router();
const claimController = require('./claim.controller');

// GET /api/claims/list
router.get('/list', claimController.getClaims);

module.exports = router;
