// src/modules/payment/payment.routes.js
const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');

// POST /api/payment/initiate
router.post('/initiate', paymentController.initiatePayment);

// POST /api/payment/webhook
router.post('/webhook', paymentController.handleWebhook);

module.exports = router;
