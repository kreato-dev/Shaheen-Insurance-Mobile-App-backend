// src/modules/payment/payment.controller.js

async function initiatePayment(req, res, next) {
  try {
    const { amount, orderId, customerEmail, applicationType, applicationId } =
      req.body;
    // TODO: create payment record, build PayFast payload
    return res.json({
      paymentUrl: null,
      paymentData: {},
      message: 'Payment initiation (stub)',
    });
  } catch (err) {
    next(err);
  }
}

async function handleWebhook(req, res, next) {
  try {
    // TODO: verify signature, update payment + related application
    // Respond quickly to gateway
    return res.json({ status: 'ok' });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiatePayment, handleWebhook };
