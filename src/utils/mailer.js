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
  const name = process.env.MAIL_FROM_NAME || 'Shaheen Insurance';
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
  const port = Number(process.env.SMTP_PORT || 587);
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

/**
 * OTP email template: shared for register + forgot password.
 */
async function sendOtpEmail({ to, otp, purpose, expiresMinutes }) {
  const purposeLabel =
    purpose === 'email_verify'
      ? 'Email Verification'
      : purpose === 'forgot_password'
      ? 'Password Reset'
      : 'OTP';

  const subject = `Shaheen Insurance - ${purposeLabel} OTP`;

  const text = `Your OTP is ${otp}. It will expire in ${expiresMinutes} minutes. If you did not request this, ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>${purposeLabel}</h2>
      <p>Your OTP is:</p>
      <div style="font-size:24px; font-weight:bold; letter-spacing:4px;">${otp}</div>
      <p>This OTP will expire in <b>${expiresMinutes} minutes</b>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * Admin initiated password reset email with embedded Link + OTP.
 */
async function sendUserPasswordResetLinkEmail({ to, name, otp, expiresMinutes }) {
  const subject = 'Action Required: Reset Your Password - Shaheen Insurance';
  
  // Construct the URL (Adjust path '/reset-password' to match your frontend route)
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${baseUrl}/reset-password?email=${encodeURIComponent(to)}&otp=${otp}`;

  const text = `Hello ${name},\n\nAn administrator has initiated a password reset for your account.\n\nClick here to reset: ${link}\n\nOr use OTP: ${otp}\n\nExpires in ${expiresMinutes} minutes.`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color: #333;">
      <h2>Password Reset Request</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>An administrator has initiated a password reset for your account.</p>
      <p>Please click the button below to set a new password:</p>
      <p>
        <a href="${link}" style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </p>
      <p>Or use the following OTP manually:</p>
      <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 10px 0;">${otp}</div>
      <p>This link will expire in <b>${expiresMinutes} minutes</b>.</p>
      <p style="font-size: 12px; color: #888; margin-top: 20px;">If the button doesn't work, copy this link: ${link}</p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  sendEmail,
  sendOtpEmail,
  sendUserPasswordResetLinkEmail,
};
