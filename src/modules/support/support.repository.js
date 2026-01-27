const { query } = require('../../config/db');

/**
 * Create ticket record and generate custom ticket_no (SUP-YYYYMMDD-ID)
 */
exports.createTicket = async (userId, subject = 'other') => {
  const r = await query(
    'INSERT INTO support_tickets (user_id, subject) VALUES (?,?)',
    [userId, subject]
  );

  const ticketNo = `SUP-${new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '')}-${String(r.insertId).padStart(6, '0')}`;

  await query(
    'UPDATE support_tickets SET ticket_no=? WHERE id=?',
    [ticketNo, r.insertId]
  );

  return { id: r.insertId, ticket_no: ticketNo };
};

/**
 * Insert a message into support_messages and update ticket timestamp
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

/**
 * Save file metadata to support_attachments
 */
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

exports.getTicketsByUser = (userId) =>
  query(
    'SELECT * FROM support_tickets WHERE user_id=? ORDER BY last_message_at DESC',
    [userId]
  );

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
 * Update ticket status + timestamp
 */
exports.touchTicket = (id, status) =>
  query(
    'UPDATE support_tickets SET status=?, last_message_at=NOW() WHERE id=?',
    [status, id]
  );
