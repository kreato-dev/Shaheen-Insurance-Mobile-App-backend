// src/modules/notifications/notification.service.js
const repo = require('./notification.repository');
const templates = require('./notification.templates');
const { sendEmail } = require('../../utils/mailer'); // ✅ your mailer
const { sendPushToUser, sendPushToAdmins } = require('./fcm.service');


function buildTitleMessage(event_key, payload) {
  switch (event_key) {
    case 'PROPOSAL_PAYMENT_REMINDER_TPLUS3':
      return { title: 'Payment Reminder', message: 'Complete payment to move your proposal to review.' };

    case 'PROPOSAL_REJECTED_REFUND_INITIATED':
      return { title: 'Proposal Rejected', message: `Reason: ${payload.rejection_reason}. Refund initiated.` };

    case 'POLICY_ISSUED':
      return { title: 'Policy Issued', message: `Your policy ${payload.policy_no} has been issued.` };

    case 'CLAIM_SUBMITTED':
      return { title: 'Claim Submitted', message: `FNOL: ${payload.fnol_no || ''}` };

    case 'CLAIM_REUPLOAD_REQUIRED':
      return { title: 'Claim Reupload Required', message: payload.reupload_notes ? `Notes: ${payload.reupload_notes}` : 'Please reupload required documents.' };

    case 'CLAIM_APPROVED':
      return { title: 'Claim Approved', message: `FNOL: ${payload.fnol_no || ''}` };

    case 'CLAIM_REJECTED':
      return { title: 'Claim Rejected', message: payload.rejection_reason ? `Reason: ${payload.rejection_reason}` : 'Your claim was rejected.' };

    // Claims - admin
    case 'ADMIN_NEW_CLAIM':
      return { title: 'New Claim Submitted', message: `FNOL: ${payload.fnol_no || ''}` };

    case 'ADMIN_CLAIM_REUPLOAD_SUBMITTED':
      return { title: 'Claim Reupload Submitted', message: `Claim updated by user. FNOL: ${payload.fnol_no || ''}` };

    case 'RENEWAL_DOCUMENT_SENT':
      return { title: 'Renewal Document', message: 'Renewal document has been shared.' };

    // Refunds
    case 'REFUND_STATUS_UPDATED':
      return {
        title: 'Refund Update',
        message: `Refund status updated: ${payload.refund_status || ''}`.trim(),
      };

    case 'REFUND_PROCESSED':
      return {
        title: 'Refund Processed',
        message: 'Your refund has been processed.',
      };

    case 'REFUND_CASE_CLOSED':
      return {
        title: 'Refund Case Closed',
        message: 'Your refund case has been closed.',
      };

    default:
      return { title: 'Update', message: 'You have a new update.' };
  }
}

async function fireUser(event_key, { user_id, entity_type, entity_id, milestone = null, data = {}, email = null }) {
  const { title, message } = buildTitleMessage(event_key, data);

  const notifId = await repo.insertNotification({
    audience: 'USER',
    user_id,
    event_key,
    title,
    message,
    data,
  });

  if (email) {
    const already = await repo.hasSendLog({ audience: 'USER', event_key, entity_type, entity_id, milestone, channel: 'EMAIL' });
    if (already) return notifId;

    try {
      await sendEmail(email); // ✅ uses src/utils/mailer.js
      await repo.insertSendLog({ notification_id: notifId, audience: 'USER', event_key, entity_type, entity_id, milestone, status: 'SENT' });
    } catch (e) {
      await repo.insertSendLog({
        notification_id: notifId,
        audience: 'USER',
        event_key,
        entity_type,
        entity_id,
        milestone,
        status: 'FAILED',
        error_text: String(e?.message || e),
      });
    }
  }
  await sendPushToUser(user_id, title, message, data);

  return notifId;
}

async function fireAdmin(event_key, { admin_id = null, entity_type, entity_id, milestone = null, data = {}, email = null }) {
  const { title, message } = buildTitleMessage(event_key, data);

  const notifId = await repo.insertNotification({
    audience: 'ADMIN',
    admin_id,
    event_key,
    title,
    message,
    data,
  });

  if (email) {
    const already = await repo.hasSendLog({ audience: 'ADMIN', event_key, entity_type, entity_id, milestone, channel: 'EMAIL' });
    if (already) return notifId;

    try {
      await sendEmail(email);
      await repo.insertSendLog({ notification_id: notifId, audience: 'ADMIN', event_key, entity_type, entity_id, milestone, status: 'SENT' });
    } catch (e) {
      await repo.insertSendLog({
        notification_id: notifId,
        audience: 'ADMIN',
        event_key,
        entity_type,
        entity_id,
        milestone,
        status: 'FAILED',
        error_text: String(e?.message || e),
      });
    }
  }

  await sendPushToAdmins(admin_id, title, message, data);
  return notifId;
}

module.exports = { fireUser, fireAdmin };