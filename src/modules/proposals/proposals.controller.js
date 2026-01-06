// src/modules/proposals/proposals.controller.js
const { getMyProposalsFeedService } = require('./proposals.service');

async function getMyProposalsFeed(req, res, next) {
  try {
    const userId = req.user.id;
    const { submission_status, page = 1, limit = 20 } = req.query;

    const result = await getMyProposalsFeedService(userId, {
      submission_status,
      page: Number(page),
      limit: Number(limit),
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyProposalsFeed };
