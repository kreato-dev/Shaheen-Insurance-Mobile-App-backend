// src/modules/notifications/notification.service.js
const repo = require('./notification.repository');
const templates = require('./notification.templates');
const { sendEmail } = require('../../utils/mailer'); // ✅ your mailer
const { sendPushToUser, sendPushToAdmins } = require('./fcm.service');


function buildTitleMessage(event_key, payload) {
  switch (event_key) {
    case 'PROPOSAL_SUBMITTED_UNPAID':
      return { title: 'Proposal Submitted', message: 'Your proposal has been submitted. Please complete payment.' };

    case 'PROPOSAL_PAYMENT_REMINDER_TPLUS3':
      return { title: 'Payment Reminder', message: 'Complete payment to move your proposal to review.' };

    case 'PROPOSAL_UNPAID_EXPIRED':
      return { title: 'Proposal Expired', message: `Your unpaid ${payload.proposal_type} proposal #${payload.proposal_id} has expired.` };

    case 'PROPOSAL_PAYMENT_CONFIRMED_REVIEW_PENDING':
      return { title: 'Payment Confirmed', message: 'Payment received. Your proposal is now under review.' };

    case 'PROPOSAL_REJECTED_REFUND_INITIATED':
      return { title: 'Proposal Rejected', message: `Reason: ${payload.rejection_reason}. Refund initiated.` };

    case 'PROPOSAL_REUPLOAD_REQUIRED':
      return { title: 'Action Required', message: payload.reupload_notes ? `Notes: ${payload.reupload_notes}` : 'Please re-upload requested documents.' };

    case 'POLICY_ISSUED':
      return { title: 'Policy Issued', message: `Your policy ${payload.policy_no} has been issued.` };

    case 'POLICY_EXPIRING_D30':
    case 'POLICY_EXPIRING_D15':
    case 'POLICY_EXPIRING_D5':
    case 'POLICY_EXPIRING_D1':
      const daysText = payload.days_left ? `in ${payload.days_left} day${payload.days_left == 1 ? '' : 's'}` : 'soon';
      return { title: 'Policy Expiring Soon', message: `Your ${payload.proposal_type} policy ${payload.policy_no} is expiring ${daysText}.` };

    case 'POLICY_EXPIRED':
      return { title: 'Policy Expired', message: `Your ${payload.proposal_type} policy ${payload.policy_no} has expired.` };

    case 'MOTOR_REG_NO_UPLOAD_REMINDER':
      return { title: 'Upload Registration Number', message: 'Please upload your vehicle registration number.' };

    case 'CLAIM_SUBMITTED':
      return { title: 'Claim Submitted', message: `FNOL: ${payload.fnol_no || ''}` };

    case 'CLAIM_REUPLOAD_REQUIRED':
      return { title: 'Claim Reupload Required', message: payload.reupload_notes ? `Notes: ${payload.reupload_notes}` : 'Please reupload required documents.' };

    case 'CLAIM_APPROVED':
      return { title: 'Claim Approved', message: `FNOL: ${payload.fnol_no || ''}` };

    case 'CLAIM_REJECTED':
      return { title: 'Claim Rejected', message: payload.rejection_reason ? `Reason: ${payload.rejection_reason}` : 'Your claim was rejected.' };

    case 'ADMIN_PROPOSAL_SUBMITTED_UNPAID':
      return { title: 'New Proposal Submitted', message: `New ${payload.proposal_type} ${payload.package_code || ''} proposal #${payload.proposal_id} submitted (Unpaid).` };

    case 'ADMIN_PROPOSAL_BECAME_PAID':
      return { title: 'Proposal Paid', message: `${payload.proposal_type} ${payload.travel_subtype || ''} Proposal #${payload.proposal_id} is paid. Ready for review.` };

    case 'ADMIN_PROPOSAL_CUSTOM_VEHICLE':
      return { title: 'Custom Vehicle Request', message: `User requested a vehicle not in list for Proposal #${payload.proposal_id}.` };

    // Claims - admin
    case 'ADMIN_NEW_CLAIM':
      return { title: 'New Claim Submitted', message: `FNOL: ${payload.fnol_no || ''}` };

    case 'ADMIN_CLAIM_REUPLOAD_SUBMITTED':
      return { title: 'Claim Reupload Submitted', message: `Claim updated by user. FNOL: ${payload.fnol_no || ''}` };

    case 'ADMIN_REFUND_ACTION_REQUIRED':
      return { title: 'Refund Action Required', message: `Refund initiated for ${payload.proposal_type} ${payload.travel_subtype} Proposal #${payload.proposal_id}. Please process.` };

    case 'ADMIN_REUPLOAD_SUBMITTED':
      return { title: 'Reupload Submitted', message: `User re-uploaded documents for ${payload.proposal_type} Proposal #${payload.proposal_id}.` };

    case 'ADMIN_MOTOR_REG_NO_UPLOADED':
      return { title: 'Registration Number Uploaded', message: `User uploaded Reg No: ${payload.registration_number} for MOTOR Proposal #${payload.proposal_id}.` };

    case 'ADMIN_POLICY_EXPIRING_D30':
    case 'ADMIN_POLICY_EXPIRING_D15':
    case 'ADMIN_POLICY_EXPIRING_D5':
    case 'ADMIN_POLICY_EXPIRING_D1':
      const adDaysText = payload.days_left ? `in ${payload.days_left} day${payload.days_left == 1 ? '' : 's'}` : 'soon';
      return { title: 'Policy Expiring', message: `${payload.proposal_type} Policy ${payload.policy_no} is expiring ${adDaysText}.` };

    case 'ADMIN_POLICY_EXPIRED':
      return { title: 'Policy Expired', message: `Policy ${payload.policy_no} has expired.` };

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

    case 'SUPPORT_TICKET_REPLY':
      return {
        title: 'New Support Reply',
        message: `Reply on ticket #${payload.ticket_no}: ${payload.message_snippet}`,
      };

    case 'SUPPORT_TICKET_CREATED':
      return { title: 'Ticket Created', message: `Ticket #${payload.ticket_no} created: ${payload.subject}` };

    case 'ADMIN_SUPPORT_TICKET_CREATED':
      return { title: 'New Support Ticket', message: `Ticket #${payload.ticket_no} created by User ${payload.user_id}.` };

    case 'ADMIN_SUPPORT_TICKET_REPLY':
      return {
        title: 'New Support Reply',
        message: `User ${payload.user_id} replied to #${payload.ticket_no}: ${payload.message_snippet}`,
      };

    case 'USER_WELCOME_EMAIL':
      return { title: 'Welcome', message: `Welcome to Shaheen Insurance, ${payload.full_name || ''}!` };

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
    // to stop dupe email (prevent spam ) uncomment:
    /*
    const already = await repo.hasSendLog({ audience: 'USER', event_key, entity_type, entity_id, milestone, channel: 'EMAIL' });
    if (already) return notifId;
    */

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
    // to stop dupe email (prevent spam ) uncomment:
    /*
    const already = await repo.hasSendLog({ audience: 'ADMIN', event_key, entity_type, entity_id, milestone, channel: 'EMAIL' });
    if (already) return notifId;
    */

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