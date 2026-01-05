// src/modules/payment/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { authMiddleware: requireAuth } = require('../../middleware/auth'); // user auth middleware

// POST /api/payment/initiate
// User must be logged in
router.post(
  '/initiate',
  requireAuth,
  paymentController.initiatePayment
);

// POST /api/payment/webhook
// Called by PayFast (NO auth)
router.post(
  '/webhook',
  paymentController.handleWebhook
);

module.exports = router;
