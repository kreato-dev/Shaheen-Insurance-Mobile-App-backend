const { query } = require('../../../config/db');

/**
 * Insert admin message
 */
exports.createMessage = async (
  ticketId,
  senderType,
  userId,
  adminId,
  message
) => {
  const r = await query(
    `INSERT INTO support_messages
     (ticket_id, sender_type, sender_user_id, sender_admin_id, message)
     VALUES (?,?,?,?,?)`,
    [ticketId, senderType, userId, adminId, message]
  );

  await query(
    'UPDATE support_tickets SET last_message_at=NOW() WHERE id=?',
    [ticketId]
  );

  return { id: r.insertId };
};

exports.saveAttachments = async (ticketId, messageId, files) => {
  for (const f of files) {
    await query(
      `INSERT INTO support_attachments
       (ticket_id, message_id, file_name, mime_type, file_size, file_path)
       VALUES (?,?,?,?,?,?)`,
      [
        ticketId,
        messageId,
        f.originalname,
        f.mimetype,
        f.size,
        `uploads/support/${f.filename}`,
      ]
    );
  }
};

exports.getAllTickets = () =>
  query('SELECT * FROM support_tickets ORDER BY last_message_at DESC');

exports.getTicket = async (id) =>
  (await query('SELECT * FROM support_tickets WHERE id=?', [id]))[0];

exports.getMessages = (ticketId) =>
  query(
    `SELECT m.*, a.file_path
     FROM support_messages m
     LEFT JOIN support_attachments a ON a.message_id=m.id
     WHERE m.ticket_id=?
     ORDER BY m.created_at`,
    [ticketId]
  );

/**
 * Update status (and closed_at if closing)
 */
exports.updateStatus = async (id, status, adminId) => {
  const closed =
    status === 'closed'
      ? ', closed_at=NOW(), closed_by_admin_id=?'
      : '';

  const params =
    status === 'closed'
      ? [status, adminId, id]
      : [status, id];

  await query(
    `UPDATE support_tickets SET status=?${closed} WHERE id=?`,
    params
  );
};

exports.touchTicket = (id, status) =>
  query(
    'UPDATE support_tickets SET status=?, last_message_at=NOW() WHERE id=?',
    [status, id]
  );
