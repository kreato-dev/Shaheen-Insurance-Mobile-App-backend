const router = require('express').Router();
const ctrl = require('./support.controller');
const upload = require('./support.upload');
// const { requireAdmin } = require('../admin/admin.middleware');

/* USER */
router.post(
  '/',
  upload.array('attachments', 5),
  ctrl.createTicket
);

router.get('/', ctrl.getMyTickets);

router.get('/:ticketId', ctrl.getTicketDetail);

router.post(
  '/:ticketId/reply',
  upload.array('attachments', 5),
  ctrl.replyTicket
);

module.exports = router;
