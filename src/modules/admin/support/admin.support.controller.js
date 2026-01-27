const service = require('./admin.support.service');

exports.getTicketDetail = async (req, res, next) => {
  try {
    const actor = req.user || (req.admin ? { ...req.admin, role: 'ADMIN' } : null);
    const data = await service.getTicketDetail(
      req.params.ticketId,
      actor
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
};

/* ADMIN */
exports.getAllTickets = async (req, res, next) => {
  try {
    res.json(await service.getAllTickets(req.query));
  } catch (e) {
    next(e);
  }
};

exports.adminReply = async (req, res, next) => {
  try {
    const msg = await service.adminReply(
      req.params.ticketId,
      req.admin.id,
      req.body.message,
      req.files
    );
    res.json(msg);
  } catch (e) {
    next(e);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    await service.updateStatus(
      req.params.ticketId,
      req.body.status,
      req.admin.id
    );
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
