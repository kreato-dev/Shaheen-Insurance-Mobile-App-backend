const { query } = require('../../config/db');
const { sendEmail } = require('../../utils/mailer');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Public URL builder for stored relative paths.
 * Example stored: "uploads/policies/policy_schedule-123.pdf"
 * Returns: "https://api.domain.com/uploads/policies/..." (if PUBLIC_BASE_URL set)
 * Fallback: "/uploads/...."
 */
function buildPublicFileUrl(relativePath) {
  if (!relativePath) return null;

  const base = String(process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');
  const rel = String(relativePath).replace(/^\/+/, '');

  return base ? `${base}/${rel}` : `/${rel}`;
}

function safeJson(obj) {
  try {
    return obj ? JSON.stringify(obj) : null;
  } catch (_) {
    return null;
  }
}

/**
 * -------------------------------------------------------
 * Admin recipients routing (RBAC aware)
 * -------------------------------------------------------
 * You can tune roles anytime. This keeps things practical.
 */
async function getAdminsByRoles(roles) {
  if (!roles?.length) return [];
  const placeholders = roles.map(() => '?').join(',');

  const rows = await query(
    `SELECT id, email, role
       FROM admins
      WHERE status='active'
        AND role IN (${placeholders})`,
    roles
  );

  return rows || [];
}

async function resolveAdminRecipients(eventKey) {
  const key = String(eventKey || '').toUpperCase();

  // Finance-heavy
  if (key === 'ADMIN_PAYMENT_RECEIVED') {
    return getAdminsByRoles(['SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATIONS_ADMIN']);
  }

  // Ops/support
  if (key === 'ADMIN_USER_REUPLOAD_SUBMITTED') {
    return getAdminsByRoles(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN']);
  }

  if (key === 'ADMIN_NEW_PROPOSAL_SUBMITTED') {
    return getAdminsByRoles(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN']);
  }

  if (key === 'ADMIN_POLICY_EXPIRED') {
    return getAdminsByRoles(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN']);
  }

  // Claims
  if (key === 'ADMIN_NEW_CLAIM_FILED' || key === 'ADMIN_CLAIM_REUPLOAD_SUBMITTED') {
    return getAdminsByRoles(['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'SUPPORT_ADMIN']);
  }

  // fallback
  return getAdminsByRoles(['SUPER_ADMIN', 'OPERATIONS_ADMIN']);
}

/**
 * -------------------------------------------------------
 * Email templates (Phase 4B)
 * -------------------------------------------------------
 */
function emailWrap(title, bodyHtml) {
  return `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>${title}</h2>
      ${bodyHtml}
      <hr />
      <p style="font-size:12px;color:#666;">Shaheen Insurance</p>
    </div>
  `;
}

/** User: Proposal paid -> auto moved to pending_review (merged) */
function makeUserProposalPaidPendingReviewEmail({ proposalType, proposalId }) {
  const subject = `Shaheen Insurance - Payment Received (Proposal in Review)`;
  const html = emailWrap(
    'Payment Received',
    `
      <p>Your payment has been received and your proposal is now in <b>Pending Review</b>.</p>
      <p><b>Type:</b> ${proposalType || '-'}</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
    `
  );
  const text = `Payment received. Your proposal is now pending review. Type: ${proposalType || '-'} Proposal ID: ${proposalId || '-'}`;
  return { subject, html, text };
}

/** User: Proposal approved */
function makeUserProposalApprovedEmail({ proposalType, proposalId }) {
  const subject = `Shaheen Insurance - Proposal Approved`;
  const html = emailWrap(
    'Proposal Approved',
    `
      <p>Your proposal has been <b>approved</b>.</p>
      <p><b>Type:</b> ${proposalType || '-'}</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
    `
  );
  const text = `Your proposal has been approved. Type: ${proposalType || '-'} Proposal ID: ${proposalId || '-'}`;
  return { subject, html, text };
}

/** User: Proposal rejected */
function makeUserProposalRejectedEmail({ proposalType, proposalId, reason }) {
  const subject = `Shaheen Insurance - Proposal Rejected`;
  const html = emailWrap(
    'Proposal Rejected',
    `
      <p>Your proposal has been <b>rejected</b>.</p>
      <p><b>Type:</b> ${proposalType || '-'}</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
      ${reason ? `<p><b>Reason:</b> ${reason}</p>` : ''}
    `
  );
  const text = `Your proposal has been rejected. Type: ${proposalType || '-'} Proposal ID: ${proposalId || '-'}${reason ? ` Reason: ${reason}` : ''}`;
  return { subject, html, text };
}

/** User: Reupload required */
function makeUserReuploadRequiredEmail({ proposalType, proposalId, notes, requiredDocs }) {
  const subject = `Shaheen Insurance - Document Re-Upload Required`;
  const html = emailWrap(
    'Re-Upload Required',
    `
      <p>We need you to re-upload some documents to continue your request.</p>
      <p><b>Type:</b> ${proposalType || '-'}</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
      ${notes ? `<p><b>Notes:</b> ${notes}</p>` : ''}
      ${
        requiredDocs?.length
          ? `<p><b>Required:</b></p><ul>${requiredDocs.map((d) => `<li>${String(d)}</li>`).join('')}</ul>`
          : ''
      }
    `
  );
  const text =
    `Re-upload required for your proposal. Type: ${proposalType || '-'} Proposal ID: ${proposalId || '-'}` +
    (notes ? ` Notes: ${notes}` : '');
  return { subject, html, text };
}

/** User: Policy issued */
function makeUserPolicyIssuedEmail({ policyNo, proposalId, scheduleUrl, proposalType }) {
  const subject = `Shaheen Insurance - Policy Issued (${policyNo || 'Policy'})`;
  const html = emailWrap(
    'Policy Issued',
    `
      <p>Your policy has been issued.</p>
      <p><b>Policy No:</b> ${policyNo || '-'}</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
      <p><b>Type:</b> ${proposalType || '-'}</p>
      ${scheduleUrl ? `<p><a href="${scheduleUrl}">Download Policy Schedule</a></p>` : ''}
    `
  );
  const text = `Policy issued. Policy No: ${policyNo || '-'} Proposal ID: ${proposalId || '-'} Type: ${proposalType || '-'}${scheduleUrl ? ` Schedule: ${scheduleUrl}` : ''}`;
  return { subject, html, text };
}

/** User: Policy expiring soon (30/15/5/1) */
function makeUserPolicyExpiringEmail({ daysLeft, policyNo, expiresAt, scheduleUrl }) {
  const subject = `Shaheen Insurance - Policy Expiring in ${daysLeft} day(s)`;
  const html = emailWrap(
    'Policy Expiring Soon',
    `
      <p>Your policy is expiring in <b>${daysLeft}</b> day(s).</p>
      <p><b>Policy No:</b> ${policyNo || '-'}</p>
      <p><b>Expiry Date:</b> ${expiresAt || '-'}</p>
      ${scheduleUrl ? `<p><a href="${scheduleUrl}">Download Policy Schedule</a></p>` : ''}
    `
  );
  const text = `Your policy is expiring in ${daysLeft} day(s). Policy No: ${policyNo || '-'} Expiry: ${expiresAt || '-'}${scheduleUrl ? ` Schedule: ${scheduleUrl}` : ''}`;
  return { subject, html, text };
}

/** User: Policy expired */
function makeUserPolicyExpiredEmail({ policyNo, expiresAt }) {
  const subject = `Shaheen Insurance - Policy Expired`;
  const html = emailWrap(
    'Policy Expired',
    `
      <p>Your policy has <b>expired</b>.</p>
      <p><b>Policy No:</b> ${policyNo || '-'}</p>
      <p><b>Expiry Date:</b> ${expiresAt || '-'}</p>
    `
  );
  const text = `Your policy has expired. Policy No: ${policyNo || '-'} Expiry: ${expiresAt || '-'}`;
  return { subject, html, text };
}

/** Admin: Policy expired */
function makeAdminPolicyExpiredEmail({ proposalType, proposalId, policyNo, userId }) {
  const subject = `Policy Expired - ${proposalType} (${policyNo || '-'})`;
  const html = emailWrap(
    'Policy Expired',
    `
      <p>A policy has expired.</p>
      <p><b>Type:</b> ${proposalType || '-'}</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
      <p><b>Policy No:</b> ${policyNo || '-'}</p>
      <p><b>User ID:</b> ${userId || '-'}</p>
    `
  );
  const text = `Policy expired. Type:${proposalType || '-'} Proposal:${proposalId || '-'} Policy:${policyNo || '-'} User:${userId || '-'}`;
  return { subject, html, text };
}


/** User: Renewal doc sent (motor only) */
function makeUserRenewalDocumentSentEmail({ policyNo, renewalDocUrl, notes }) {
  const subject = `Shaheen Insurance - Renewal Document`;
  const html = emailWrap(
    'Renewal Document',
    `
      <p>Your renewal document is available.</p>
      <p><b>Policy No:</b> ${policyNo || '-'}</p>
      ${notes ? `<p><b>Notes:</b> ${notes}</p>` : ''}
      ${renewalDocUrl ? `<p><a href="${renewalDocUrl}">Download Renewal Document</a></p>` : ''}
    `
  );
  const text = `Renewal document available. Policy No: ${policyNo || '-'}${notes ? ` Notes: ${notes}` : ''}${renewalDocUrl ? ` Download: ${renewalDocUrl}` : ''}`;
  return { subject, html, text };
}

/** User: Claim filed (FNOL created) */
function makeUserClaimFiledEmail({ fnolRef, policyNo }) {
  const subject = `Shaheen Insurance - Claim Received (FNOL: ${fnolRef})`;
  const html = emailWrap(
    'Claim Submitted',
    `
      <p>Your claim has been submitted successfully.</p>
      <p><b>FNOL Reference:</b> ${fnolRef || '-'}</p>
      <p><b>Policy No:</b> ${policyNo || '-'}</p>
    `
  );
  const text = `Claim submitted. FNOL: ${fnolRef || '-'} Policy: ${policyNo || '-'}`;
  return { subject, html, text };
}

/** User: Claim reupload required */
function makeUserClaimReuploadRequiredEmail({ fnolRef, notes }) {
  const subject = `Shaheen Insurance - Claim Document Re-Upload Required`;
  const html = emailWrap(
    'Claim Re-Upload Required',
    `
      <p>We need additional/clearer evidence for your claim.</p>
      <p><b>FNOL:</b> ${fnolRef || '-'}</p>
      ${notes ? `<p><b>Notes:</b> ${notes}</p>` : ''}
    `
  );
  const text = `Claim re-upload required. FNOL: ${fnolRef || '-'}${notes ? ` Notes: ${notes}` : ''}`;
  return { subject, html, text };
}

/** User: Claim approved/rejected */
function makeUserClaimDecisionEmail({ fnolRef, status, reason }) {
  const label = String(status || '').toLowerCase() === 'approved' ? 'Approved' : 'Rejected';
  const subject = `Shaheen Insurance - Claim ${label} (FNOL: ${fnolRef})`;
  const html = emailWrap(
    `Claim ${label}`,
    `
      <p>Your claim has been <b>${label}</b>.</p>
      <p><b>FNOL:</b> ${fnolRef || '-'}</p>
      ${reason ? `<p><b>Remarks:</b> ${reason}</p>` : ''}
    `
  );
  const text = `Your claim has been ${label}. FNOL: ${fnolRef || '-'}${reason ? ` Remarks: ${reason}` : ''}`;
  return { subject, html, text };
}

/** User: Motor registration number reminder (T+4) */
function makeMotorRegNumberReminderEmail({ proposalId }) {
  const subject = `Shaheen Insurance - Upload Vehicle Registration Number`;
  const html = emailWrap(
    'Registration Number Required',
    `
      <p>It looks like your car registration is still pending.</p>
      <p>Please upload/update the <b>vehicle registration number</b>.</p>
      <p><b>Proposal ID:</b> ${proposalId || '-'}</p>
    `
  );
  const text = `Please upload/update your vehicle registration number. Proposal ID: ${proposalId || '-'}`;
  return { subject, html, text };
}

/**
 * -------------------------------------------------------
 * Core DB writers
 * -------------------------------------------------------
 * Assumes:
 * - user notifications table = notifications
 * - admin notifications table = admin_notifications
 * - both tables have event_key/ref_type/ref_id/data_json/email_sent/email_sent_at
 */

async function createUserNotification({
  userId,
  title,
  body,
  eventKey,
  refType,
  refId,
  data,
  emailSent = false,
}) {
  if (!userId) throw httpError(400, 'userId is required');

  const sentAt = new Date();

  await query(
    `
    INSERT INTO notifications
      (user_id, title, body, type, event_key, ref_type, ref_id, data_json, is_read, sent_at, email_sent, email_sent_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `,
    [
      userId,
      title,
      body,
      eventKey || null, // keep your existing "type" usage as event key
      eventKey || null,
      refType || null,
      refId || null,
      data ? safeJson(data) : null,
      sentAt,
      emailSent ? 1 : 0,
      emailSent ? sentAt : null,
    ]
  );
}

async function createAdminNotification({
  adminId,
  title,
  body,
  eventKey,
  refType,
  refId,
  data,
  emailSent = false,
}) {
  if (!adminId) throw httpError(400, 'adminId is required');

  const sentAt = new Date();

  await query(
    `
    INSERT INTO admin_notifications
      (admin_id, title, body, type, event_key, ref_type, ref_id, data_json, is_read, sent_at, email_sent, email_sent_at)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `,
    [
      adminId,
      title,
      body,
      eventKey || null,
      eventKey || null,
      refType || null,
      refId || null,
      data ? safeJson(data) : null,
      sentAt,
      emailSent ? 1 : 0,
      emailSent ? sentAt : null,
    ]
  );
}

/**
 * -------------------------------------------------------
 * Public API
 * -------------------------------------------------------
 */

/**
 * notifyUser()
 * - Inserts user notification row
 * - Optionally emails user
 */
async function notifyUser({
  userId,
  userEmail,
  eventKey,
  title,
  body,
  refType,
  refId,
  data,
  email, // { enabled, subject, html, text }
}) {
  let emailSent = false;

  if (email?.enabled && userEmail) {
    await sendEmail({
      to: userEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    emailSent = true;
  }

  await createUserNotification({
    userId,
    title,
    body,
    eventKey,
    refType,
    refId,
    data,
    emailSent,
  });

  return { emailSent };
}

/**
 * notifyAdmins()
 * - Resolves recipients based on eventKey
 * - Inserts admin notifications for each admin
 * - Optionally sends email to each admin
 */
async function notifyAdmins({ eventKey, title, body, refType, refId, data, email }) {
  const admins = await resolveAdminRecipients(eventKey);

  for (const a of admins) {
    let emailSent = false;

    if (email?.enabled && a.email) {
      await sendEmail({
        to: a.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      emailSent = true;
    }

    await createAdminNotification({
      adminId: a.id,
      title,
      body,
      eventKey,
      refType,
      refId,
      data,
      emailSent,
    });
  }

  return { recipients: admins.length };
}

/**
 * Optional: lightweight dedupe helper (cron-safe).
 * Usage: if you want to check before notifyUser/notifyAdmins.
 */
async function hasUserNotification({ userId, eventKey, refType, refId }) {
  const rows = await query(
    `
    SELECT id
      FROM notifications
     WHERE user_id = ?
       AND event_key = ?
       AND (ref_type <=> ?)
       AND (ref_id <=> ?)
     LIMIT 1
    `,
    [userId, eventKey, refType || null, refId || null]
  );
  return (rows || []).length > 0;
}

async function hasAdminNotification({ adminId, eventKey, refType, refId }) {
  const rows = await query(
    `
    SELECT id
      FROM admin_notifications
     WHERE admin_id = ?
       AND event_key = ?
       AND (ref_type <=> ?)
       AND (ref_id <=> ?)
     LIMIT 1
    `,
    [adminId, eventKey, refType || null, refId || null]
  );
  return (rows || []).length > 0;
}

module.exports = {
  // helpers
  buildPublicFileUrl,
  hasUserNotification,
  hasAdminNotification,

  // templates
  makeUserProposalPaidPendingReviewEmail,
  makeUserProposalApprovedEmail,
  makeUserProposalRejectedEmail,
  makeUserReuploadRequiredEmail,
  makeUserPolicyIssuedEmail,
  makeUserPolicyExpiringEmail,
  makeUserPolicyExpiredEmail,
  makeAdminPolicyExpiredEmail,
  makeUserRenewalDocumentSentEmail,
  makeUserClaimFiledEmail,
  makeUserClaimReuploadRequiredEmail,
  makeUserClaimDecisionEmail,
  makeMotorRegNumberReminderEmail,

  // main notify functions
  notifyUser,
  notifyAdmins,
};
