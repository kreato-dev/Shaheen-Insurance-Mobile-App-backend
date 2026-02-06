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

function makePaymentConfirmedReviewPendingEmail({ to, fullName, proposalLabel, coverNoteUrl }) {
  const subject = 'Payment Confirmed — Pending Review';
  const text = `Hi ${fullName || ''}, payment received for (${proposalLabel}). Your proposal is now in pending review.`;
  const html = wrapHtml(
    'Payment Confirmed',
    `<p>Hi ${fullName || ''},</p>
     <p>Payment received for <b>${proposalLabel}</b>.</p>
     <p>Your proposal is now in <b>Pending Review</b>.</p>
     ${coverNoteUrl ? `<p><b>Cover Note:</b> <a href="${coverNoteUrl}">Download</a></p>` : ''}`
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

function makePolicyIssuedEmail({ to, fullName, policyNo, policyExpiresAt, proposalLabel, coverNoteUrl, policyScheduleUrl }) {
  const subject = `Policy Issued: ${policyNo}`;
  const text = `Hi ${fullName || ''}, your policy ${policyNo} has been issued.\nProposal: ${proposalLabel || ''}\nExpires: ${policyExpiresAt || ''}`;
  const html = wrapHtml(
    'Policy Issued ✅',
    `<p>Hi ${fullName || ''},</p>
     <p>Your policy <b>${policyNo}</b> has been issued.</p>
     ${proposalLabel ? `<p><b>Proposal:</b> ${proposalLabel}</p>` : ''}
     ${policyExpiresAt ? `<p><b>Expires:</b> ${policyExpiresAt}</p>` : ''}
     <p>Your policy schedule document is available in the app.</p>
     ${coverNoteUrl ? `<p><b>Cover Note:</b> <a href="${coverNoteUrl}">Download</a></p>` : ''}
     ${policyScheduleUrl ? `<p><b>Policy Schedule:</b> <a href="${policyScheduleUrl}">Download</a></p>` : ''}`
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

function makeMotorRegNoReminderEmail({ to, fullName, proposalLabel, policyNo }) {
  const subject = `Reminder: Upload Vehicle Registration Number (${proposalLabel})`;
  const text = `Hi ${fullName || ''}, your policy is issued but your vehicle registration number is still pending.\nProposal: ${proposalLabel}\nPolicy No: ${policyNo || 'N/A'}\nPlease upload the registration number from the app.`;
  const html = wrapHtml(
    'Upload Registration Number',
    `<p>Hi ${fullName || ''},</p>
     <p>Your policy is issued, but your registration number is still pending.</p>
     <p><b>Proposal:</b> ${proposalLabel}</p>
     ${policyNo ? `<p><b>Policy No:</b> ${policyNo}</p>` : ''}
     <p>Please open the app and upload the registration number.</p>`
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

function makeUserRefundStatusUpdatedEmail({
  proposalType,
  travelSubtype,
  proposalId,
  refundStatus,
  refundAmount,
  refundReference,
  refundRemarks,
  refundEvidenceUrl,
}) {
  const typeText = proposalType === 'TRAVEL'
    ? `TRAVEL (${String(travelSubtype || '').toUpperCase()})`
    : 'MOTOR';

  const statusText = String(refundStatus || '').toUpperCase();

  return {
    subject: `Refund Update - ${typeText} - ${statusText}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.5">
        <h2 style="margin:0 0 12px">Refund Status Updated</h2>
        <p>Your refund status has been updated.</p>

        <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr><td><b>Type</b></td><td>${typeText}</td></tr>
          <tr><td><b>Proposal ID</b></td><td>${proposalId}</td></tr>
          <tr><td><b>Status</b></td><td>${statusText}</td></tr>
          <tr><td><b>Amount</b></td><td>${refundAmount ?? '-'}</td></tr>
          <tr><td><b>Reference</b></td><td>${refundReference ?? '-'}</td></tr>
          <tr><td><b>Remarks</b></td><td>${refundRemarks ?? '-'}</td></tr>
          <tr><td><b>Evidence</b></td><td>${
            refundEvidenceUrl ? `<a href="${refundEvidenceUrl}" target="_blank">View Evidence</a>` : '-'
          }</td></tr>
        </table>

        <p style="margin-top:12px">
          If you have any questions, please contact support.
        </p>
      </div>
    `,
  };
}

function makeRenewalDocumentSentEmail({ to, fullName, policyNo, renewalDocumentUrl, renewalNotes }) {
  const subject = 'Renewal Document Available';
  const text = `Hi ${fullName || ''}, renewal document for policy ${policyNo} is available.`;
  const html = wrapHtml(
    'Renewal Document Sent',
    `<p>Hi ${fullName || ''},</p>
     <p>Your renewal document for policy <b>${policyNo}</b> is available.</p>
     ${renewalNotes ? `<p><b>Notes:</b> ${renewalNotes}</p>` : ''}
     ${renewalDocumentUrl ? `<p><b>Document:</b> <a href="${renewalDocumentUrl}">Download</a></p>` : ''}`
  );
  return { to, subject, text, html };
}

// ------------------------
// Claims (Motor) Emails
// ------------------------

function makeClaimSubmittedEmail({ to, fullName, fnolNo, policyNo }) {
  const subject = 'Claim Submitted';
  const text = `Hi ${fullName || ''}, your claim has been submitted. FNOL: ${fnolNo}${policyNo ? ` | Policy: ${policyNo}` : ''}.`;
  const html = wrapHtml(
    'Claim Submitted ✅',
    `<p>Hi ${fullName || ''},</p>
     <p>Your claim has been submitted successfully.</p>
     <p><b>FNOL:</b> ${fnolNo}</p>
     ${policyNo ? `<p><b>Policy No:</b> ${policyNo}</p>` : ''}
     <p>Our team will review it shortly.</p>`
  );
  return { to, subject, text, html };
}

function makeAdminNewMotorClaimEmail({
  to,
  fnolNo,
  policyNo,
  registrationNumber,
  claimType,
  incidentDate,
  userName,
  userMobile,
  userEmail,
  claimId,
}) {
  const subject = `New Motor Claim Submitted — ${fnolNo}`;
  const text =
    `A new motor claim has been submitted.\n` +
    `FNOL: ${fnolNo}\n` +
    (policyNo ? `Policy: ${policyNo}\n` : '') +
    (registrationNumber ? `Reg#: ${registrationNumber}\n` : '') +
    `Type: ${claimType}\n` +
    `Incident: ${incidentDate}\n` +
    `User: ${userName || '-'} | ${userMobile || '-'} | ${userEmail || '-'}\n` +
    `Claim ID: ${claimId}`;

  const html = wrapHtml(
    'New Motor Claim Submitted 🚨',
    `<p>A new motor claim has been submitted.</p>
     <p><b>FNOL:</b> ${fnolNo}</p>
     ${policyNo ? `<p><b>Policy No:</b> ${policyNo}</p>` : ''}
     ${registrationNumber ? `<p><b>Registration No:</b> ${registrationNumber}</p>` : ''}
     <p><b>Claim Type:</b> ${claimType}</p>
     <p><b>Incident Date:</b> ${incidentDate}</p>
     <p><b>User:</b> ${userName || '-'} <br/>
        <b>Mobile:</b> ${userMobile || '-'} <br/>
        <b>Email:</b> ${userEmail || '-'}</p>
     <p><b>Claim ID:</b> ${claimId}</p>`
  );

  return { to, subject, text, html };
}

function makeAdminClaimReuploadSubmittedEmail({ to, fnolNo, userName, userId, claimId }) {
  const subject = `Claim Reupload Submitted — ${fnolNo}`;
  const text = `User ${userName || userId} has re-uploaded documents for Claim ${fnolNo}.`;
  const html = wrapHtml(
    'Claim Reupload Submitted',
    `<p>User <b>${userName || userId}</b> has re-uploaded documents for Claim <b>${fnolNo}</b>.</p>
     <p><b>Claim ID:</b> ${claimId}</p>
     <p>Please review the updated claim.</p>`
  );
  return { to, subject, text, html };
}

function makeClaimDecisionEmail({
  to,
  fullName,
  fnolNo,
  status,
  rejectionReason = null,
  reuploadNotes = null,
  requiredDocs = null,
}) {
  const pretty =
    status === 'approved' ? 'Approved ✅' :
      status === 'rejected' ? 'Rejected ❌' :
        status === 'reupload_required' ? 'Reupload Required 📄' :
          'Updated';

  const subject = `Claim Update — ${pretty}`;
  const text =
    `Hi ${fullName || ''}, your claim (${fnolNo}) status is now: ${status}.\n` +
    (rejectionReason ? `Reason: ${rejectionReason}\n` : '') +
    (reuploadNotes ? `Notes: ${reuploadNotes}\n` : '');

  const docsHtml = Array.isArray(requiredDocs) && requiredDocs.length
    ? `<p><b>Required Documents:</b></p><ul>${requiredDocs.map(d => {
        if (typeof d === 'string') return `<li>${d}</li>`;
        if (d && typeof d === 'object') {
          const name = d.doc_type || d.docType || 'Document';
          const side = d.side ? ` (${d.side})` : '';
          return `<li>${name}${side}</li>`;
        }
        return `<li>${d}</li>`;
      }).join('')}</ul>`
    : '';

  const html = wrapHtml(
    'Claim Status Update',
    `<p>Hi ${fullName || ''},</p>
     <p>Your claim <b>${fnolNo}</b> status is now: <b>${pretty}</b></p>
     ${rejectionReason ? `<p><b>Reason:</b> ${rejectionReason}</p>` : ''}
     ${reuploadNotes ? `<p><b>Notes:</b> ${reuploadNotes}</p>` : ''}
     ${docsHtml}`
  );

  return { to, subject, text, html };
}

function makeProposalReuploadRequiredEmail({ to, fullName, proposalLabel, reuploadNotes, requiredDocs }) {
  const subject = `Action Required: Re-upload Documents (${proposalLabel})`;

  const docsHtml = Array.isArray(requiredDocs) && requiredDocs.length
    ? `<p><b>Required Documents:</b></p><ul>${requiredDocs.map(d => {
        if (typeof d === 'string') return `<li>${d}</li>`;
        if (d && typeof d === 'object') {
          const name = d.doc_type || d.docType || 'Document';
          const side = d.side ? ` (${d.side})` : '';
          return `<li>${name}${side}</li>`;
        }
        return `<li>${d}</li>`;
      }).join('')}</ul>`
    : '';

  const text = `Admin requested document re-upload for your proposal.\nProposal: ${proposalLabel}\nNotes: ${reuploadNotes || 'N/A'}\n`;
  const html = wrapHtml(
    'Action Required: Re-upload Documents',
    `<p>Hi ${fullName || ''},</p>
     <p>Admin requested document re-upload for your proposal.</p>
     <p><b>Proposal:</b> ${proposalLabel}</p>
     <p><b>Notes:</b> ${reuploadNotes || 'N/A'}</p>
     ${docsHtml}
     <p>Please open the app and re-upload the requested documents.</p>`
  );
  return { to, subject, text, html };
}

function makeAdminRefundActionRequiredEmail({ to, proposalLabel, userName, userId }) {
  const subject = `Refund Needs Processing (${proposalLabel})`;
  const text = `Refund initiated due to proposal rejection.\nProposal: ${proposalLabel}\nUser: ${userName || userId}\n`;
  const html = wrapHtml(
    'Refund Needs Processing',
    `<p><b>Proposal:</b> ${proposalLabel}</p>
     <p><b>User:</b> ${userName || userId}</p>
     <p>Refund status is now <b>refund_initiated</b>. Please process and upload evidence.</p>`
  );
  return { to, subject, text, html };
}

function makeAdminMotorRegNoUploadedEmail({ to, proposalLabel, registrationNumber, userName, userId }) {
  const subject = `Motor Registration Number Uploaded (${proposalLabel})`;
  const text = `User uploaded motor registration number.\nProposal: ${proposalLabel}\nReg No: ${registrationNumber}\nUser: ${userName || userId}\n`;
  const html = wrapHtml(
    'Motor Registration Number Uploaded',
    `<p><b>Proposal:</b> ${proposalLabel}</p>
     <p><b>Registration No:</b> ${registrationNumber}</p>
     <p><b>User:</b> ${userName || userId}</p>`
  );
  return { to, subject, text, html };
}

function makeAdminProposalPaidEmail({ to, proposalLabel }) {
  const subject = `Paid Proposal Ready for Review (${proposalLabel})`;
  const text = `A paid proposal is ready for review: ${proposalLabel}`;
  const html = wrapHtml(
    'Paid Proposal Ready for Review',
    `<p><b>${proposalLabel}</b> is now paid and pending review.</p>`
  );
  return { to, subject, text, html };
}

function makeAdminReuploadSubmittedEmail({ to, proposalLabel, userName, userId, saved }) {
  const subject = `Reupload Submitted (${proposalLabel})`;

  const savedList = Array.isArray(saved) && saved.length > 0
    ? `<ul>${saved.map(s => `<li>${s}</li>`).join('')}</ul>`
    : '<p>No files listed</p>';

  const text = `User submitted requested reupload.\nProposal: ${proposalLabel}\nUser: ${userName || userId}\nSaved: ${Array.isArray(saved) ? saved.join(', ') : ''}`;
  const html = wrapHtml(
    'Reupload Submitted',
    `<p><b>Proposal:</b> ${proposalLabel}</p>
     <p><b>User:</b> ${userName || userId}</p>
     <p><b>Uploaded:</b></p>${savedList}`
  );
  return { to, subject, text, html };
}

function makeSupportTicketCreatedEmail({ to, fullName, ticketId, ticketSubject }) {
  const subject = `Support Ticket Created: #${ticketId}`;
  const text = `Hi ${fullName || ''}, your support ticket #${ticketId} has been created.\nSubject: ${ticketSubject}`;
  const html = wrapHtml(
    'Support Ticket Created',
    `<p>Hi ${fullName || ''},</p>
     <p>Your support ticket <b>#${ticketId}</b> has been created successfully.</p>
     <p><b>Subject:</b> ${ticketSubject}</p>
     <p>Our team will get back to you shortly.</p>`
  );
  return { to, subject, text, html };
}

function makeSupportTicketReplyEmail({ to, fullName, ticketId, message }) {
  const subject = `New Reply on Ticket #${ticketId}`;
  const text = `Hi ${fullName || ''}, you have a new reply on ticket #${ticketId}.\n\n"${message}"`;
  const html = wrapHtml(
    'New Reply Received',
    `<p>Hi ${fullName || ''},</p>
     <p>You have a new reply on ticket <b>#${ticketId}</b>.</p>
     <blockquote style="background:#f9f9f9; border-left:4px solid #ccc; margin:10px 0; padding:10px;">
       ${message}
     </blockquote>
     <p>Please open the app to view the full conversation.</p>`
  );
  return { to, subject, text, html };
}

function makeAdminSupportTicketCreatedEmail({ to, ticketId, userId, userEmail, ticketSubject }) {
  const subject = `New Support Ticket #${ticketId}`;
  const text = `User ${userEmail} (ID: ${userId}) created ticket #${ticketId}.\nSubject: ${ticketSubject}`;
  const html = wrapHtml(
    'New Support Ticket',
    `<p><b>Ticket:</b> #${ticketId}</p>
     <p><b>User:</b> ${userEmail} (ID: ${userId})</p>
     <p><b>Subject:</b> ${ticketSubject}</p>`
  );
  return { to, subject, text, html };
}

function makeAdminSupportTicketReplyEmail({ to, ticketId, userId, userEmail, messageSnippet }) {
  const subject = `New Reply on Ticket #${ticketId}`;
  const text = `User ${userEmail} (ID: ${userId}) replied to ticket #${ticketId}.\n"${messageSnippet}"`;
  const html = wrapHtml(
    'New Support Reply',
    `<p><b>Ticket:</b> #${ticketId}</p>
     <p><b>User:</b> ${userEmail} (ID: ${userId})</p>
     <blockquote style="background:#f9f9f9; border-left:4px solid #ccc; margin:10px 0; padding:10px;">
       ${messageSnippet}
     </blockquote>`
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
  makeUserRefundStatusUpdatedEmail,
  makeRenewalDocumentSentEmail,
  makeClaimSubmittedEmail,
  makeAdminNewMotorClaimEmail,
  makeClaimDecisionEmail,
  makeProposalReuploadRequiredEmail,
  makeAdminRefundActionRequiredEmail,
  makeAdminMotorRegNoUploadedEmail,
  makeAdminProposalPaidEmail,
  makeAdminReuploadSubmittedEmail,
  makeSupportTicketCreatedEmail,
  makeSupportTicketReplyEmail,
  makeAdminSupportTicketCreatedEmail,
  makeAdminSupportTicketReplyEmail,
  makeAdminClaimReuploadSubmittedEmail,
};
