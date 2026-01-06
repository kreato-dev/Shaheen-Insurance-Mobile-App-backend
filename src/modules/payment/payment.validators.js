// src/modules/payment/payment.validators.js
const httpError = require('http-errors');

const TRAVEL_SUBTYPES = new Set([
  'DOMESTIC',
  'HAJJ_UMRAH_ZIARAT',
  'INTERNATIONAL',
  'STUDENT_GUARD',
]);

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateInitiatePaymentBody(req, res, next) {
  const {
    amount,
    orderId,
    customerEmail,
    applicationType,
    applicationSubtype,
    applicationId,
  } = req.body || {};

  if (amount == null) return next(httpError(400, 'amount is required'));
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return next(httpError(400, 'amount must be a positive number'));
  }

  if (!isNonEmptyString(customerEmail)) {
    return next(httpError(400, 'customerEmail is required'));
  }

  if (!isNonEmptyString(applicationType)) {
    return next(httpError(400, 'applicationType is required'));
  }

  const appType = String(applicationType).trim().toUpperCase();
  if (!['MOTOR', 'TRAVEL'].includes(appType)) {
    return next(httpError(400, 'applicationType must be MOTOR or TRAVEL'));
  }

  const appId = Number(applicationId);
  if (!Number.isFinite(appId) || appId <= 0) {
    return next(httpError(400, 'applicationId must be a positive number'));
  }

  if (appType === 'TRAVEL') {
    if (!isNonEmptyString(applicationSubtype)) {
      return next(httpError(400, 'applicationSubtype is required when applicationType=TRAVEL'));
    }
    const sub = String(applicationSubtype).trim().toUpperCase();
    if (!TRAVEL_SUBTYPES.has(sub)) {
      return next(
        httpError(
          400,
          'applicationSubtype must be DOMESTIC | HAJJ_UMRAH_ZIARAT | INTERNATIONAL | STUDENT_GUARD'
        )
      );
    }
    req.body.applicationSubtype = sub; // normalize
  } else {
    // MOTOR -> ignore subtype if sent
    req.body.applicationSubtype = null;
  }

  if (orderId != null && !isNonEmptyString(String(orderId))) {
    return next(httpError(400, 'orderId must be a non-empty string if provided'));
  }

  // normalize type
  req.body.applicationType = appType;
  req.body.applicationId = appId;

  next();
}

module.exports = {
  validateInitiatePaymentBody,
};
