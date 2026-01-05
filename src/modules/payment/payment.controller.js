// src/modules/payment/payment.controller.js
const {
  initiatePaymentService,
  handleWebhookService,
} = require('./payment.service');

// POST /api/payment/initiate
async function initiatePayment(req, res, next) {
  try {
    const userId = req.user.id;

    const {
      amount,
      orderId,
      customerEmail,
      applicationType,
      applicationSubtype, // ✅ NEW (required when applicationType=TRAVEL)
      applicationId,
    } = req.body;

    const result = await initiatePaymentService({
      userId,
      amount,
      orderId,
      customerEmail,
      applicationType,
      applicationSubtype, // ✅ pass through
      applicationId,
    });

    // Frontend will typically open result.paymentUrl in a WebView
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/payment/webhook
// Called by PayFast directly (NO auth header)
async function handleWebhook(req, res, next) {
  try {
    // For PayFast, body is x-www-form-urlencoded
    const payload = req.body;

    await handleWebhookService(payload);

    // Respond quickly with simple OK
    return res.status(200).send('OK');
  } catch (err) {
    // For gateway callbacks, still return 200 but log error
    console.error('Payment webhook error:', err.message);
    // You can choose 200 or 400 here; many gateways prefer 200 regardless
    return res.status(200).send('ERR');
  }
}

module.exports = { initiatePayment, handleWebhook };
