// src/modules/policy/policy.routes.js
const express = require('express');
const router = express.Router();
const policyController = require('./policy.controller');

// GET /api/policies/list
router.get('/list', policyController.getPolicies);

// GET /api/policies/:id
router.get('/:id', policyController.getPolicyById);

module.exports = router;
