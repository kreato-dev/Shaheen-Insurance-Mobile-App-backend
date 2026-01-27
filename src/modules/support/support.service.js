const { query } = require('../../config/db');
const repo = require('./support.repository');
const { fireUser, fireAdmin } = require('../notifications/notification.service');
const templates = require('../notifications/notification.templates');

function httpError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

/**
 * Create a new support ticket
 * - Creates ticket + first message
 * - Saves attachments
 * - Sends confirmation email to User
 * - Sends alert email to Admin
 */
exports.createTicket = async (userId, body, files) => {
  const { subject, message } = body;
  if (!message) throw httpError(400, 'Message required');

  const ticket = await repo.createTicket(userId, subject);
  const msg = await repo.createMessage(
    ticket.id,
    'USER',
    userId,
    null,
    message
  );

  if (files?.length) {
    await repo.saveAttachments(ticket.id, msg.id, files);
  }

  // Notifications
  try {
    const [u] = await query('SELECT full_name, email FROM users WHERE id=?', [userId]);
    if (u) {
      // 1. Notify User (Confirmation)
      fireUser('SUPPORT_TICKET_CREATED', {
        user_id: userId,
        entity_type: 'support_ticket',
        entity_id: ticket.id,
        data: { ticket_id: ticket.id, ticket_no: ticket.ticket_no, subject },
        email: templates.makeSupportTicketCreatedEmail({
          to: u.email,
          fullName: u.full_name,
          ticketId: ticket.ticket_no,
          ticketSubject: subject,
        }),
      });

      const adminEmails = (process.env.ADMIN_ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);

      // 2. Notify Admin (Alert)
      fireAdmin('ADMIN_SUPPORT_TICKET_CREATED', {
        entity_type: 'support_ticket',
        entity_id: ticket.id,
        data: { ticket_id: ticket.id, ticket_no: ticket.ticket_no, subject, user_id: userId },
        email: adminEmails.length > 0 ? templates.makeAdminSupportTicketCreatedEmail({
          to: adminEmails.join(','),
          ticketId: ticket.ticket_no,
          userId,
          userEmail: u.email,
          ticketSubject: subject,
        }) : null,
      });
    }
  } catch (e) { console.error('Support notification error:', e); }

  return { ticket_no: ticket.ticket_no };
};

/**
 * List tickets for the logged-in user
 */
exports.getUserTickets = (userId, q) =>
  repo.getTicketsByUser(userId, q);

/**
 * Get ticket details + messages
 * - Enforces ownership check
 */
exports.getTicketDetail = async (ticketId, user) => {
  const ticket = await repo.getTicket(ticketId);
  if (!ticket) throw httpError(404, 'Ticket not found');

  if (ticket.user_id !== user.id)
    throw httpError(403, 'Forbidden');

  const messages = await repo.getMessages(ticketId);
  const baseUrl = process.env.APP_BASE_URL || 'http://localhost:4000';

  return {
    ticket,
    messages: messages.map((m) => ({
      ...m,
      file_url: m.file_path ? `${baseUrl}/${m.file_path.replace(/^\//, '')}` : null,
    })),
  };
};

/**
 * User replies to a ticket
 * - Validates ticket is open
 * - Saves message + attachments
 * - Notifies Admin
 */
exports.replyTicket = async (userId, ticketId, body, files) => {
  const { message } = body;
  if (!message) throw httpError(400, 'Message required');

  const ticket = await repo.getTicket(ticketId);
  if (!ticket) throw httpError(404, 'Ticket not found');
  if (ticket.user_id !== userId) throw httpError(403, 'Forbidden');
  if (ticket.status === 'closed') throw httpError(400, 'Cannot reply to a closed ticket');

  const msg = await repo.createMessage(ticketId, 'USER', userId, null, message);

  if (files?.length) {
    await repo.saveAttachments(ticketId, msg.id, files);
  }

  // Notify Admin of new reply
  try {
    const adminEmails = (process.env.ADMIN_ALERT_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
    const [u] = await query('SELECT email FROM users WHERE id=?', [userId]);

    fireAdmin('ADMIN_SUPPORT_TICKET_REPLY', {
      entity_type: 'support_ticket',
      entity_id: ticketId,
      milestone: `reply_${msg.id}`,
      data: { ticket_id: ticketId, ticket_no: ticket.ticket_no, user_id: userId, message_snippet: message.substring(0, 50) },
      email: adminEmails.length > 0 ? templates.makeAdminSupportTicketReplyEmail({
        to: adminEmails.join(','),
        ticketId: ticket.ticket_no,
        userId,
        userEmail: u?.email || 'N/A',
        messageSnippet: message.substring(0, 100),
      }) : null,
    });
  } catch (e) { console.error('Support reply notification error:', e); }

  // Re-open or keep open on user reply
  await repo.touchTicket(ticketId, 'open');
  return msg;
};