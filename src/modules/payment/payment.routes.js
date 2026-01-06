// src/modules/payment/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { validateInitiatePaymentBody } = require('./payment.validators');

// POST /api/payment/initiate
// User must be logged in
router.post(
  '/initiate',
  validateInitiatePaymentBody,
  paymentController.initiatePayment
);

// POST /api/payment/webhook
// Called by PayFast (NO auth)
router.post(
  '/webhook',
  paymentController.handleWebhook
);

router.post(
  '/dev/mark-success',
  paymentController.markSuccessDev
);

module.exports = router;
