const service = require('./support.service');

exports.createTicket = async (req, res, next) => {
  try {
    const ticket = await service.createTicket(
      req.user.id,
      req.body,
      req.files
    );
    res.status(201).json(ticket);
  } catch (e) {
    next(e);
  }
};

exports.getMyTickets = async (req, res, next) => {
  try {
    const data = await service.getUserTickets(req.user.id, req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.getTicketDetail = async (req, res, next) => {
  try {
    const data = await service.getTicketDetail(
      req.params.ticketId,
      req.user
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.replyTicket = async (req, res, next) => {
  try {
    const msg = await service.replyTicket(
      req.user.id,
      req.params.ticketId,
      req.body,
      req.files
    );
    res.json(msg);
  } catch (e) {
    next(e);
  }
};
