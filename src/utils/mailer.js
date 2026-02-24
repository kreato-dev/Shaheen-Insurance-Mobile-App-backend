/*
 * mailer.js = only sending emails (SMTP config + send function)
 * Provider swap = only change ENV vars or this file later.
 */
// src/utils/mailer.js
const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Build "From" header properly:
 * "Shaheen Insurance <no-reply@shaheeninsurance.com>"
 */
function buildFrom() {
  const name = process.env.MAIL_FROM_NAME;
  const email = process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER;
  return `${name} <${email}>`;
}

/**
 * Create transporter lazily (on first send).
 * This prevents crashes during require() if env isn't ready.
 */
function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';

  // ✅ Helpful logs (mask password)
  console.log('[MAIL] Creating transporter with:', {
    host,
    port,
    secure,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? '***SET***' : 'MISSING',
    from: buildFrom(),
    nodeEnv: process.env.NODE_ENV,
  });

  if (!host) throw new Error('SMTP_HOST is missing');
  if (!process.env.SMTP_USER) throw new Error('SMTP_USER is missing');
  if (!process.env.SMTP_PASS) throw new Error('SMTP_PASS is missing');

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Optional (helps some hosts)
    // tls: { rejectUnauthorized: false },
  });

  return transporter;
}

/**
 * Send email (generic function).
 */
async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  const from = buildFrom();

  console.log('[MAIL] Sending email:', { to, from, subject });

  try {
    const info = await t.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log('[MAIL] Sent OK:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return info;
  } catch (err) {
    console.error('[MAIL] Send failed:', {
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      message: err.message,
    });
    throw err;
  }
}

module.exports = { sendEmail };