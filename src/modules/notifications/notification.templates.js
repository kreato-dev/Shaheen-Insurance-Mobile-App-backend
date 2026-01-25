// src/modules/notifications/notification.templates.js

function wrapHtml(title, bodyHtml) {
  return `
    <div style="font-family: Arial, sans-serif; line-height:1.6;">
      <h2>${title}</h2>
      ${bodyHtml}
      <hr style="margin-top:20px; border:none; border-top:1px solid #eee;" />
      <p style="color:#777; font-size:12px;">
        Shaheen Insurance — This is an automated message.
      </p>
    </div>
  `;
}

function makeWelcomeEmail({ to, fullName }) {
  const subject = 'Welcome to Shaheen Insurance';
  const text = `Hi ${fullName || ''}, welcome to Shaheen Insurance.`;
  const html = wrapHtml('Welcome 🎉', `<p>Hi ${fullName || ''},</p><p>Welcome to Shaheen Insurance.</p>`);
  return { to, subject, text, html };
}

function makeProposalPaymentReminderEmail({ to, fullName, proposalLabel }) {
  const subject = 'Payment Reminder — Proposal Pending';
  const text = `Hi ${fullName || ''}, your proposal (${proposalLabel}) is pending payment. Please complete payment to move it to review.`;
  const html = wrapHtml(
    'Payment Reminder',
    `<p>Hi ${fullName || ''},</p>
     <p>Your proposal <b>${proposalLabel}</b> is pending payment.</p>
     <p>Please complete payment to move it to review.</p>`
  );
  return { to, subject, text, html };
}

function makeProposalUnpaidExpiredEmail({ to, fullName, proposalLabel }) {
  const subject = 'Proposal Expired — Unpaid';
  const text = `Hi ${fullName || ''}, your unpaid proposal (${proposalLabel}) has expired.`;
  const html = wrapHtml(
    'Proposal Expired',
    `<p>Hi ${fullName || ''},</p>
     <p>Your unpaid proposal <b>${proposalLabel}</b> has expired.</p>`
  );
  return { to, subject, text, html };
}

function makePaymentConfirmedReviewPendingEmail({ to, fullName, proposalLabel }) {
  const subject = 'Payment Confirmed — Pending Review';
  const text = `Hi ${fullName || ''}, payment received for (${proposalLabel}). Your proposal is now in pending review.`;
  const html = wrapHtml(
    'Payment Confirmed',
    `<p>Hi ${fullName || ''},</p>
     <p>Payment received for <b>${proposalLabel}</b>.</p>
     <p>Your proposal is now in <b>Pending Review</b>.</p>`
  );
  return { to, subject, text, html };
}

// ✅ Combined reject + refund initiated
function makeProposalRejectedRefundInitiatedEmail({ to, fullName, proposalLabel, rejectionReason }) {
  const subject = 'Proposal Rejected — Refund Initiated';
  const text = `Hi ${fullName || ''}, your proposal (${proposalLabel}) was rejected. Reason: ${rejectionReason}. Refund has been initiated.`;
  const html = wrapHtml(
    'Proposal Rejected (Refund Initiated)',
    `<p>Hi ${fullName || ''},</p>
     <p>Your proposal <b>${proposalLabel}</b> was rejected.</p>
     <p><b>Reason:</b> ${rejectionReason || '-'}</p>
     <p>Refund has been <b>initiated</b>. Our team will process it shortly.</p>`
  );
  return { to, subject, text, html };
}

function makePolicyIssuedEmail({ to, fullName, policyNo, policyExpiresAt }) {
  const subject = 'Policy Issued';
  const text = `Hi ${fullName || ''}, your policy ${policyNo} has been issued.`;
  const html = wrapHtml(
    'Policy Issued ✅',
    `<p>Hi ${fullName || ''},</p>
     <p>Your policy <b>${policyNo}</b> has been issued.</p>
     ${policyExpiresAt ? `<p><b>Expires:</b> ${policyExpiresAt}</p>` : ''}`
  );
  return { to, subject, text, html };
}

function makePolicyExpiringEmail({ to, fullName, policyNo, daysLeft, policyExpiresAt }) {
  const subject = `Policy Expiring in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`;
  const text = `Hi ${fullName || ''}, your policy ${policyNo} will expire in ${daysLeft} day(s).`;
  const html = wrapHtml(
    'Policy Expiring Soon',
    `<p>Hi ${fullName || ''},</p>
     <p>Your policy <b>${policyNo}</b> will expire in <b>${daysLeft}</b> day(s).</p>
     ${policyExpiresAt ? `<p><b>Expires:</b> ${policyExpiresAt}</p>` : ''}`
  );
  return { to, subject, text, html };
}

function makePolicyExpiredEmail({ to, fullName, policyNo }) {
  const subject = 'Policy Expired';
  const text = `Hi ${fullName || ''}, your policy ${policyNo} has expired.`;
  const html = wrapHtml(
    'Policy Expired',
    `<p>Hi ${fullName || ''},</p>
     <p>Your policy <b>${policyNo}</b> has expired.</p>`
  );
  return { to, subject, text, html };
}

function makeMotorRegNoReminderEmail({ to, fullName, proposalLabel }) {
  const subject = 'Reminder — Upload Registration Number';
  const text = `Hi ${fullName || ''}, please upload your vehicle registration number for ${proposalLabel}.`;
  const html = wrapHtml(
    'Upload Registration Number',
    `<p>Hi ${fullName || ''},</p>
     <p>Please upload your vehicle registration number for <b>${proposalLabel}</b>.</p>`
  );
  return { to, subject, text, html };
}

function makeRefundProcessedEmail({ to, fullName, proposalLabel }) {
  const subject = 'Refund Processed';
  const text = `Hi ${fullName || ''}, your refund for (${proposalLabel}) has been processed.`;
  const html = wrapHtml(
    'Refund Processed',
    `<p>Hi ${fullName || ''},</p>
     <p>Your refund for <b>${proposalLabel}</b> has been processed.</p>`
  );
  return { to, subject, text, html };
}

function makeRefundCaseClosedEmail({ to, fullName, proposalLabel }) {
  const subject = 'Refund Case Closed';
  const text = `Hi ${fullName || ''}, your refund case for (${proposalLabel}) has been closed.`;
  const html = wrapHtml(
    'Refund Case Closed',
    `<p>Hi ${fullName || ''},</p>
     <p>Your refund case for <b>${proposalLabel}</b> has been closed.</p>`
  );
  return { to, subject, text, html };
}

function makeRenewalDocumentSentEmail({ to, fullName, policyNo }) {
  const subject = 'Renewal Document Available';
  const text = `Hi ${fullName || ''}, renewal document for policy ${policyNo} is available.`;
  const html = wrapHtml(
    'Renewal Document Sent',
    `<p>Hi ${fullName || ''},</p>
     <p>Your renewal document for policy <b>${policyNo}</b> is available.</p>`
  );
  return { to, subject, text, html };
}

module.exports = {
  makeWelcomeEmail,
  makeProposalPaymentReminderEmail,
  makeProposalUnpaidExpiredEmail,
  makePaymentConfirmedReviewPendingEmail,
  makeProposalRejectedRefundInitiatedEmail,
  makePolicyIssuedEmail,
  makePolicyExpiringEmail,
  makePolicyExpiredEmail,
  makeMotorRegNoReminderEmail,
  makeRefundProcessedEmail,
  makeRefundCaseClosedEmail,
  makeRenewalDocumentSentEmail,
};
