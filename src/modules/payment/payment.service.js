// src/modules/payment/payment.service.js
const crypto = require('crypto');
const { query } = require('../../config/db');

const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const PAYFAST_PROCESS_URL =
  process.env.PAYFAST_PROCESS_URL || 'https://sandbox.payfast.co.za/eng/process';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';
const PAYFAST_RETURN_URL =
  process.env.PAYFAST_RETURN_URL || 'http://localhost:4000/payment/success';
const PAYFAST_CANCEL_URL =
  process.env.PAYFAST_CANCEL_URL || 'http://localhost:4000/payment/cancel';

// Our backend webhook endpoint
const PAYFAST_NOTIFY_URL = `${APP_BASE_URL}/api/payment/webhook`;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Helper: format amount to 2 decimals
function formatAmount(amount) {
  const num = Number(amount);
  if (Number.isNaN(num) || num <= 0) {
    throw httpError(400, 'Invalid amount');
  }
  return num.toFixed(2);
}

// Helper: build signature according to PayFast-style rules
function generateSignature(data) {
  const passphrase = PAYFAST_PASSPHRASE;
  const keys = Object.keys(data).sort();
  const paramString = keys
    .map((key) => `${key}=${encodeURIComponent(String(data[key]).trim())}`)
    .join('&');

  const stringToSign = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`
    : paramString;

  return crypto.createHash('md5').update(stringToSign).digest('hex');
}

const TRAVEL_SUBTYPES = new Set([
  'DOMESTIC',
  'HAJJ_UMRAH_ZIARAT',
  'INTERNATIONAL',
  'STUDENT_GUARD',
]);

const TRAVEL_TABLE_BY_SUBTYPE = {
  DOMESTIC: 'travel_domestic_proposals',
  HAJJ_UMRAH_ZIARAT: 'travel_huj_proposals',
  INTERNATIONAL: 'travel_international_proposals',
  STUDENT_GUARD: 'travel_student_proposals',
};

/**
 * Initiate Payment
 * - Creates DB payment row with PENDING
 * - Builds PayFast URL + params
 * - Returns URL to frontend (WebView)
 */
async function initiatePaymentService({
  userId,
  amount,
  orderId,
  customerEmail,
  applicationType,
  applicationSubtype, // ✅ NEW (required for TRAVEL)
  applicationId,
}) {
  if (!userId) throw httpError(401, 'User is required');

  if (!amount || !customerEmail || !applicationType || !applicationId) {
    throw httpError(
      400,
      'amount, customerEmail, applicationType and applicationId are required'
    );
  }

  const cleanAmount = formatAmount(amount);
  const appType = String(applicationType || '').toUpperCase();

  if (!['MOTOR', 'TRAVEL'].includes(appType)) {
    throw httpError(400, 'applicationType must be MOTOR or TRAVEL');
  }

  // Normalize subtype
  let appSubtype = applicationSubtype ? String(applicationSubtype).toUpperCase() : null;

  if (appType === 'TRAVEL') {
    if (!appSubtype || !TRAVEL_SUBTYPES.has(appSubtype)) {
      throw httpError(
        400,
        'applicationSubtype is required for TRAVEL (DOMESTIC|HAJJ_UMRAH_ZIARAT|INTERNATIONAL|STUDENT_GUARD)'
      );
    }
  } else {
    appSubtype = null; // MOTOR has no subtype
  }

  let finalOrderId = orderId;
  if (!finalOrderId) {
    finalOrderId = `ORD-${appType}-${Date.now()}`;
  }

  // Optional: validate that application exists
  if (appType === 'MOTOR') {
    const rows = await query(
      'SELECT id FROM motor_proposals WHERE id = ? LIMIT 1',
      [applicationId]
    );
    if (rows.length === 0) {
      throw httpError(400, 'Invalid motor proposal (applicationId)');
    }
  } else if (appType === 'TRAVEL') {
    const table = TRAVEL_TABLE_BY_SUBTYPE[appSubtype];
    if (!table) {
      throw httpError(400, 'Invalid applicationSubtype for TRAVEL');
    }
    const rows = await query(
      `SELECT id FROM ${table} WHERE id = ? LIMIT 1`,
      [applicationId]
    );
    if (rows.length === 0) {
      throw httpError(400, `Invalid travel proposal (applicationId) for subtype ${appSubtype}`);
    }
  }

  // Insert payment record
  // ✅ NOTE: payments table must have application_subtype column for this to work
  const insertResult = await query(
    `INSERT INTO payments
     (user_id, application_type, application_subtype, application_id, amount, status, gateway, order_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 'PayFast', ?, NOW(), NOW())`,
    [userId, appType, appSubtype, applicationId, cleanAmount, finalOrderId]
  );

  const paymentId = insertResult.insertId;

  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
    throw httpError(
      500,
      'Payment gateway not configured (merchant id/key missing)'
    );
  }

  const itemName =
    appType === 'MOTOR' ? 'Motor Insurance Policy' : 'Travel Insurance Policy';

  // Data we send to PayFast
  const pfData = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: PAYFAST_RETURN_URL,
    cancel_url: PAYFAST_CANCEL_URL,
    notify_url: PAYFAST_NOTIFY_URL,
    m_payment_id: paymentId,
    amount: cleanAmount,
    item_name: itemName,
    email_address: customerEmail,
  };

  const signature = generateSignature(pfData);
  const allParams = { ...pfData, signature };

  const queryString = Object.keys(allParams)
    .sort()
    .map((key) => `${key}=${encodeURIComponent(String(allParams[key]).trim())}`)
    .join('&');

  const paymentUrl = `${PAYFAST_PROCESS_URL}?${queryString}`;

  return {
    paymentId,
    gateway: 'PayFast',
    paymentUrl,
    pfData: allParams,
  };
}

/**
 * Handle PayFast webhook
 * - Validate signature
 * - Update payment status (SUCCESS/FAILED)
 * - Update related proposal payment_status + review_status
 *
 * Lifecycle rule:
 * Submitted + paid → Pending Review (review_status = pending_review)
 */
async function handleWebhookService(payload) {
  if (!payload || typeof payload !== 'object') {
    throw httpError(400, 'Invalid webhook payload');
  }

  const receivedSignature = payload.signature;
  if (!receivedSignature) {
    throw httpError(400, 'Missing signature from gateway');
  }

  const dataForSign = { ...payload };
  delete dataForSign.signature;

  const calculatedSignature = generateSignature(dataForSign);

  if (
    String(receivedSignature).toLowerCase() !==
    String(calculatedSignature).toLowerCase()
  ) {
    throw httpError(400, 'Invalid payment signature');
  }

  const paymentIdStr = payload['m_payment_id'];
  const pfPaymentId =
    payload['pf_payment_id'] || payload['payment_id'] || null;
  const paymentStatus =
    payload['payment_status'] || payload['status'] || 'FAILED';

  const paymentId = Number(paymentIdStr);
  if (!paymentId || Number.isNaN(paymentId)) {
    throw httpError(400, 'Invalid m_payment_id');
  }

  const rows = await query(
    'SELECT * FROM payments WHERE id = ? LIMIT 1',
    [paymentId]
  );
  if (rows.length === 0) {
    throw httpError(404, 'Payment record not found');
  }

  const payment = rows[0];

  // Optional: validate amount matches
  const amountFromGateway = payload['amount_gross'] || payload['amount'];
  if (amountFromGateway) {
    const expected = Number(payment.amount);
    const actual = Number(amountFromGateway);
    if (!Number.isNaN(actual) && Math.abs(expected - actual) > 1) {
      throw httpError(400, 'Amount mismatch between gateway and system');
    }
  }

  let newStatus = 'FAILED';
  const normalized = String(paymentStatus).toUpperCase();
  if (normalized === 'COMPLETE' || normalized === 'SUCCESS' || normalized === 'PAID') {
    newStatus = 'SUCCESS';
  }

  // Update payments table
  await query(
    `UPDATE payments
        SET status = ?,
            gateway_txn_id = ?,
            raw_response = ?,
            updated_at = NOW()
      WHERE id = ?`,
    [newStatus, pfPaymentId, JSON.stringify(payload), paymentId]
  );

  // On success, mark proposal as paid + pending_review
  if (newStatus === 'SUCCESS') {
    if (payment.application_type === 'MOTOR') {
      await query(
        `
        UPDATE motor_proposals
        SET
          payment_status = 'paid',
          paid_at = COALESCE(paid_at, NOW()),
          review_status = CASE
            WHEN review_status = 'not_applicable' THEN 'pending_review'
            ELSE review_status
          END,
          submitted_at = COALESCE(submitted_at, NOW()),
          expires_at = NULL,
          updated_at = NOW()
        WHERE id = ?
        `,
        [payment.application_id]
      );
    } else if (payment.application_type === 'TRAVEL') {
      const subtype = payment.application_subtype
        ? String(payment.application_subtype).toUpperCase()
        : null;

      const table = TRAVEL_TABLE_BY_SUBTYPE[subtype];
      if (!table) {
        throw httpError(400, 'Missing/invalid application_subtype in payments for TRAVEL');
      }

      await query(
        `
        UPDATE ${table}
        SET
          payment_status = 'paid',
          paid_at = COALESCE(paid_at, NOW()),
          review_status = CASE
            WHEN review_status = 'not_applicable' THEN 'pending_review'
            ELSE review_status
          END,
          submitted_at = COALESCE(submitted_at, NOW()),
          expires_at = NULL,
          updated_at = NOW()
        WHERE id = ?
        `,
        [payment.application_id]
      );
    }
  }

  return {
    paymentId,
    status: newStatus,
  };
}

module.exports = {
  initiatePaymentService,
  handleWebhookService,
};
