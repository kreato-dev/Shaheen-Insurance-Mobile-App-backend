const { query } = require('../../../config/db');
const repo = require('./admin.support.repository');
const { fireUser } = require('../../notifications/notification.service');
const templates = require('../../notifications/notification.templates');
const { logAdminAction } = require('../adminlogs/admin.logs.service');

function httpError(status, msg) {
  const e = new Error(msg);
  e.status = status;
  return e;
}

/**
 * Get ticket details for Admin (no ownership check needed)
 */
exports.getTicketDetail = async (ticketId, user) => {
  const ticket = await repo.getTicket(ticketId);
  if (!ticket) throw httpError(404, 'Ticket not found');

  if (user.role !== 'ADMIN' && ticket.user_id !== user.id)
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

/* ADMIN */
/**
 * List all tickets for admin dashboard
 */
exports.getAllTickets = (q) => repo.getAllTickets(q);

/**
 * Admin replies to a ticket -> Notifies User
 */
exports.adminReply = async (ticketId, adminId, message, files) => {
  if (!message) throw httpError(400, 'Message required');

  const ticket = await repo.getTicket(ticketId);
  if (!ticket) throw httpError(404, 'Ticket not found');
  if (ticket.status === 'closed') throw httpError(400, 'Cannot reply to a closed ticket');

  const msg = await repo.createMessage(
    ticketId,
    'ADMIN',
    null,
    adminId,
    message
  );

  if (files?.length) {
    await repo.saveAttachments(ticketId, msg.id, files);
  }

  // Notify User of Admin Reply
  try {
    const rows = await query(
      `SELECT t.ticket_no, t.subject, u.id AS user_id, u.email, u.full_name
       FROM support_tickets t
       JOIN users u ON u.id = t.user_id
       WHERE t.id=?`,
      [ticketId]
    );
    if (rows.length > 0) {
      const t = rows[0];
      fireUser('SUPPORT_TICKET_REPLY', {
        user_id: t.user_id,
        entity_type: 'support_ticket',
        entity_id: ticketId,
        milestone: `reply_${msg.id}`,
        data: { ticket_id: ticketId, ticket_no: t.ticket_no, message_snippet: message.substring(0, 50) },
        email: templates.makeSupportTicketReplyEmail({
          to: t.email,
          fullName: t.full_name,
          ticketId: t.ticket_no,
          message,
        }),
      });
    }
  } catch (e) { console.error('Admin support reply notification error:', e); }

  await repo.touchTicket(ticketId, 'in_process');

  await logAdminAction({
    adminId,
    module: 'SUPPORT',
    action: 'REPLY_TICKET',
    targetId: ticketId,
    details: { messageId: msg.id, messageSnippet: message.substring(0, 50) },
  });

  return msg;
};

/**
 * Update ticket status (e.g. close)
 */
exports.updateStatus = async (ticketId, status, adminId) => {
  await repo.updateStatus(ticketId, status, adminId);

  await logAdminAction({
    adminId,
    module: 'SUPPORT',
    action: 'UPDATE_STATUS',
    targetId: ticketId,
    details: { status },
  });
};
