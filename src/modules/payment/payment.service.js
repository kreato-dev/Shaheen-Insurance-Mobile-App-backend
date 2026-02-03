// src/modules/payment/payment.service.js
const crypto = require('crypto');
const path = require('path');
const { query, getConnection } = require('../../config/db');
const { fireUser, fireAdmin } = require('../notifications/notification.service');
const E = require('../notifications/notification.events');
const templates = require('../notifications/notification.templates');
const { generatePdfFromHtml } = require('../../utils/pdfGenerator');
const { createMotorCoverNoteHtml, createTravelCoverNoteHtml } = require('../../utils/policy.templates');
const { getMotorProposalByIdForUser } = require('../motor/motor.service');
const { getTravelProposalByIdForUser } = require('../travel/travel.service');


const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
const PAYFAST_PROCESS_URL =
  process.env.PAYFAST_PROCESS_URL || 'https://sandbox.payfast.co.za/eng/process';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';
const PAYFAST_RETURN_URL =
  process.env.PAYFAST_RETURN_URL || `${APP_BASE_URL}/payment/success`;
const PAYFAST_CANCEL_URL =
  process.env.PAYFAST_CANCEL_URL || `${APP_BASE_URL}/payment/cancel`;

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

function normalizeAppType(v) {
  const t = String(v || '').trim().toUpperCase();
  if (!['MOTOR', 'TRAVEL'].includes(t)) throw httpError(400, 'applicationType must be MOTOR or TRAVEL');
  return t;
}

// Your DB enum values (frontend sends these)
function normalizeTravelSubtypeEnum(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim().toUpperCase();
  if (!['DOMESTIC', 'HAJJ_UMRAH_ZIARAT', 'INTERNATIONAL', 'STUDENT_GUARD'].includes(s)) {
    throw httpError(
      400,
      'applicationSubtype must be DOMESTIC | HAJJ_UMRAH_ZIARAT | INTERNATIONAL | STUDENT_GUARD'
    );
  }
  return s;
}

function getTravelProposalTableBySubtype(subtypeEnum) {
  switch (subtypeEnum) {
    case 'DOMESTIC':
      return 'travel_domestic_proposals';
    case 'HAJJ_UMRAH_ZIARAT':
      return 'travel_huj_proposals';
    case 'INTERNATIONAL':
      return 'travel_international_proposals';
    case 'STUDENT_GUARD':
      return 'travel_student_proposals';
    default:
      return null;
  }
}

/**
 * Helper: Generate Cover Note PDF and return relative path
 */
async function generateAndSaveCoverNote(proposalType, proposalId, userId, travelSubtype = null) {
  try {
    let htmlContent = '';
    let fileName = '';

    if (proposalType === 'MOTOR') {
      const fullData = await getMotorProposalByIdForUser(userId, proposalId);
      htmlContent = createMotorCoverNoteHtml({ proposalId, ...fullData });
      fileName = `Motor_CoverNote_${proposalId}_${Date.now()}.pdf`;
    } else if (proposalType === 'TRAVEL') {
      const fullData = await getTravelProposalByIdForUser(userId, travelSubtype, proposalId);
      htmlContent = createTravelCoverNoteHtml({ proposalId, ...fullData });
      fileName = `Travel_CoverNote_${proposalId}_${Date.now()}.pdf`;
    }

    if (!htmlContent) return null;

    // Save to uploads/policies
    const relativePath = `uploads/policies/${fileName}`;
    // Go up 3 levels from src/modules/payment to root, then into uploads/policies
    const absolutePath = path.join(__dirname, '../../../uploads/policies', fileName);

    await generatePdfFromHtml(htmlContent, absolutePath);

    return relativePath;
  } catch (err) {
    console.error('Error generating cover note:', err);
    return null; // Don't fail the payment if PDF fails
  }
}

/**
 * Initiate Payment
 * - Creates DB payment row with PENDING
 * - Builds PayFast URL + params
 * - Returns URL to frontend (WebView)
 *
 * req.body expected:
 * - amount
 * - customerEmail
 * - applicationType: MOTOR | TRAVEL
 * - applicationSubtype: (TRAVEL only) DOMESTIC | HAJJ_UMRAH_ZIARAT | INTERNATIONAL | STUDENT_GUARD
 * - applicationId
 */
async function initiatePaymentService({
  userId,
  amount,
  orderId,
  customerEmail,
  applicationType,
  applicationSubtype, // IMPORTANT: TRAVEL enum from frontend
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
  const appType = normalizeAppType(applicationType);

  const appId = Number(applicationId);
  if (!appId || Number.isNaN(appId)) throw httpError(400, 'Invalid applicationId');

  const subtypeEnum =
    appType === 'TRAVEL' ? normalizeTravelSubtypeEnum(applicationSubtype) : null;

  if (appType === 'TRAVEL' && !subtypeEnum) {
    throw httpError(400, 'applicationSubtype is required when applicationType=TRAVEL');
  }

  let finalOrderId = orderId;
  if (!finalOrderId) {
    finalOrderId = `ORD-${appType}-${Date.now()}`;
  }

  // Validate that application exists
  if (appType === 'MOTOR') {
    const rows = await query(
      'SELECT id FROM motor_proposals WHERE id = ? LIMIT 1',
      [appId]
    );
    if (rows.length === 0) throw httpError(400, 'Invalid motor proposal (applicationId)');
  } else {
    const table = getTravelProposalTableBySubtype(subtypeEnum);
    if (!table) throw httpError(400, 'Invalid travel subtype');

    const rows = await query(
      `SELECT id FROM ${table} WHERE id = ? LIMIT 1`,
      [appId]
    );
    if (rows.length === 0) throw httpError(400, 'Invalid travel proposal (applicationId)');
  }

  // Insert payment record
  const insertResult = await query(
    `INSERT INTO payments
     (user_id, application_type, application_subtype, application_id, amount, status, gateway, order_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'PENDING', 'PayFast', ?, NOW(), NOW())`,
    [userId, appType, subtypeEnum, appId, cleanAmount, finalOrderId]
  );

  const paymentId = insertResult.insertId;

  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
    throw httpError(500, 'Payment gateway not configured (merchant id/key missing)');
  }

  const itemName =
    appType === 'MOTOR' ? 'Motor Insurance Policy' : `Travel Insurance Policy (${subtypeEnum})`;

  // Data we send to PayFast
  const pfData = {
    merchant_id: PAYFAST_MERCHANT_ID,
    merchant_key: PAYFAST_MERCHANT_KEY,
    return_url: PAYFAST_RETURN_URL,
    cancel_url: PAYFAST_CANCEL_URL,
    notify_url: PAYFAST_NOTIFY_URL,
    m_payment_id: paymentId, // our internal ID to map back in webhook
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
 * - On success: mark proposal as paid + move to pending_review
 *
 * IMPORTANT: PayFast sends x-www-form-urlencoded (express.urlencoded())
 */
async function handleWebhookService(payload) {
  if (!payload || typeof payload !== 'object') {
    throw httpError(400, 'Invalid webhook payload');
  }

  const receivedSignature = payload.signature;
  if (!receivedSignature) {
    throw httpError(400, 'Missing signature from gateway');
  }

  // We must not include signature itself when regenerating
  const dataForSign = { ...payload };
  delete dataForSign.signature;

  const calculatedSignature = generateSignature(dataForSign);

  if (
    String(receivedSignature).toLowerCase() !==
    String(calculatedSignature).toLowerCase()
  ) {
    throw httpError(400, 'Invalid payment signature');
  }

  const paymentIdStr = payload.m_payment_id || payload['m_payment_id'];
  const pfPaymentId = payload.pf_payment_id || payload.payment_id || null;

  // PayFast often uses payment_status: COMPLETE
  const paymentStatusRaw = payload.payment_status || payload.status || 'FAILED';
  const normalizedStatus = String(paymentStatusRaw).trim().toUpperCase();

  const paymentId = Number(paymentIdStr);
  if (!paymentId || Number.isNaN(paymentId)) {
    throw httpError(400, 'Invalid m_payment_id');
  }

  // Determine new status
  let newStatus = 'FAILED';
  if (['COMPLETE', 'SUCCESS', 'PAID', 'COMPLETED'].includes(normalizedStatus)) {
    newStatus = 'SUCCESS';
  }

  // Use transaction: update payments + update proposal atomically
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT * FROM payments WHERE id = ? LIMIT 1 FOR UPDATE',
      [paymentId]
    );
    if (!rows.length) throw httpError(404, 'Payment record not found');
    const payment = rows[0];

    // Idempotency: if already SUCCESS/FAILED, we can safely no-op
    if (payment.status === 'SUCCESS' || payment.status === 'FAILED') {
      await conn.commit();
      return { paymentId, status: payment.status, alreadyProcessed: true };
    }

    // Optional: validate amount matches (use small tolerance)
    const amountFromGateway = payload.amount_gross || payload.amount;
    if (amountFromGateway != null) {
      const expected = Number(payment.amount);
      const actual = Number(amountFromGateway);
      if (!Number.isNaN(actual) && Math.abs(expected - actual) > 1) {
        throw httpError(400, 'Amount mismatch between gateway and system');
      }
    }

    // Update payments table
    await conn.execute(
      `UPDATE payments
         SET status = ?,
             gateway_txn_id = ?,
             raw_response = ?,
             updated_at = NOW()
       WHERE id = ?`,
      [newStatus, pfPaymentId, JSON.stringify(payload), paymentId]
    );

    // On success, mark proposal as paid and move to pending_review
    let coverNotePath = null;
    if (newStatus === 'SUCCESS') {
      if (payment.application_type === 'MOTOR') {
        coverNotePath = await generateAndSaveCoverNote('MOTOR', payment.application_id, payment.user_id);
        await conn.execute(
          `UPDATE motor_proposals
              SET payment_status = 'paid',
                  paid_at = NOW(),
                  review_status = 'pending_review',
                  cover_note_path = ?,
                  submitted_at = COALESCE(submitted_at, NOW()),
                  updated_at = NOW()
            WHERE id = ?`,
          [coverNotePath, payment.application_id]
        );
      } else if (payment.application_type === 'TRAVEL') {
        const subtypeEnum = payment.application_subtype;
        const table = getTravelProposalTableBySubtype(subtypeEnum);
        if (!table) throw httpError(400, 'Invalid travel subtype on payment record');

        coverNotePath = await generateAndSaveCoverNote('TRAVEL', payment.application_id, payment.user_id, subtypeEnum);
        await conn.execute(
          `UPDATE ${table}
              SET payment_status = 'paid',
                  paid_at = NOW(),
                  review_status = 'pending_review',
                  cover_note_path = ?,
                  submitted_at = COALESCE(submitted_at, NOW()),
                  updated_at = NOW()
            WHERE id = ?`,
          [coverNotePath, payment.application_id]
        );
      }
    }

    await conn.commit();

    const coverNoteUrl = coverNotePath ? `${APP_BASE_URL}/${coverNotePath}` : null;

    return {
      paymentId,
      status: newStatus,
      coverNoteUrl,
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function markPaymentSuccessDev({ paymentId }) {
  const id = Number(paymentId);
  if (!id || Number.isNaN(id)) throw httpError(400, 'Invalid paymentId');

  const conn = await getConnection();

  // ✅ we'll collect needed info during the transaction
  let notifCtx = null;
  let coverNotePath = null;

  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      'SELECT * FROM payments WHERE id = ? LIMIT 1 FOR UPDATE',
      [id]
    );
    if (!rows.length) throw httpError(404, 'Payment record not found');

    const payment = rows[0];

    // idempotent
    if (payment.status === 'SUCCESS') {
      await conn.commit();
      return { ok: true, paymentId: id, status: 'SUCCESS', alreadyProcessed: true };
    }

    await conn.execute(
      `UPDATE payments
       SET status='SUCCESS', updated_at=NOW()
       WHERE id=?`,
      [id]
    );

    // ✅ Update proposal + build notif context (user details for email)
    if (payment.application_type === 'MOTOR') {
      coverNotePath = await generateAndSaveCoverNote('MOTOR', payment.application_id, payment.user_id);

      await conn.execute(
        `UPDATE motor_proposals
         SET payment_status='paid',
             paid_at=NOW(),
             review_status='pending_review',
             cover_note_path=?,
             updated_at=NOW()
         WHERE id=?`,
        [coverNotePath, payment.application_id]
      );

      const [urows] = await conn.execute(
        `SELECT mp.id AS proposal_id, mp.user_id, u.email, u.full_name
         FROM motor_proposals mp
         JOIN users u ON u.id = mp.user_id
         WHERE mp.id = ?
         LIMIT 1`,
        [payment.application_id]
      );

      if (urows.length) {
        notifCtx = {
          proposalType: 'MOTOR',
          travelSubtype: null,
          proposalId: urows[0].proposal_id,
          userId: urows[0].user_id,
          userEmail: urows[0].email,
          fullName: urows[0].full_name,
        };
      }
    } else if (payment.application_type === 'TRAVEL') {
      const subtype = payment.application_subtype;
      const table = getTravelProposalTableBySubtype(subtype);
      if (!table) throw httpError(400, 'Invalid travel subtype on payment record');

      coverNotePath = await generateAndSaveCoverNote('TRAVEL', payment.application_id, payment.user_id, subtype);

      await conn.execute(
        `UPDATE ${table}
         SET payment_status='paid',
             paid_at=NOW(),
             review_status='pending_review',
             cover_note_path=?,
             updated_at=NOW()
         WHERE id=?`,
        [coverNotePath, payment.application_id]
      );

      const [urows] = await conn.execute(
        `SELECT tp.id AS proposal_id, tp.user_id, u.email, u.full_name
         FROM ${table} tp
         JOIN users u ON u.id = tp.user_id
         WHERE tp.id = ?
         LIMIT 1`,
        [payment.application_id]
      );

      if (urows.length) {
        notifCtx = {
          proposalType: 'TRAVEL',
          travelSubtype: subtype,
          proposalId: urows[0].proposal_id,
          userId: urows[0].user_id,
          userEmail: urows[0].email,
          fullName: urows[0].full_name,
        };
      }
    }

    await conn.commit();

    const coverNoteUrl = coverNotePath ? `${APP_BASE_URL}/${coverNotePath}` : null;

    // ✅ AFTER COMMIT: fire notifications + emails
    if (notifCtx) {
      const proposalLabel =
        notifCtx.proposalType === 'MOTOR'
          ? `MOTOR-${notifCtx.proposalId}`
          : `TRAVEL-${notifCtx.travelSubtype}-${notifCtx.proposalId}`;

      const entityType = notifCtx.proposalType === 'MOTOR'
        ? 'proposal_MOTOR'
        : `proposal_TRAVEL_${String(notifCtx.travelSubtype).toUpperCase()}`;

      // USER: Payment confirmed + pending review
      fireUser(E.PROPOSAL_PAYMENT_CONFIRMED_REVIEW_PENDING, {
        user_id: notifCtx.userId,
        entity_type: entityType,
        entity_id: notifCtx.proposalId,
        data: {
          proposal_type: notifCtx.proposalType,
          travel_subtype: notifCtx.travelSubtype,
          proposal_id: notifCtx.proposalId,
        },
        email: templates.makePaymentConfirmedReviewPendingEmail({
          to: notifCtx.userEmail,
          fullName: notifCtx.fullName,
          proposalLabel,
          coverNoteUrl,
        }),
      });

      // ADMIN: proposal became paid (ready for review)
      // ✅ For admin email recipients, use env ADMIN_ALERT_EMAILS="a@x.com,b@y.com"
      const adminEmails = (process.env.ADMIN_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      fireAdmin(E.ADMIN_PROPOSAL_BECAME_PAID, {
        entity_type: entityType,
        entity_id: notifCtx.proposalId,
        data: {
          proposal_type: notifCtx.proposalType,
          travel_subtype: notifCtx.travelSubtype,
          proposal_id: notifCtx.proposalId,
        },
        email:
          adminEmails.length > 0
            ? templates.makeAdminProposalPaidEmail({
                to: adminEmails.join(','),
                proposalLabel,
              })
            : null,
      });
    }

    return { ok: true, paymentId: id, status: 'SUCCESS', coverNoteUrl };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}


module.exports = {
  initiatePaymentService,
  handleWebhookService,
  markPaymentSuccessDev,
};
