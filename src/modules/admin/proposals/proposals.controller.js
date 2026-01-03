const service = require('./proposals.service');

async function listUnifiedProposals(req, res, next) {
  try {
    const result = await service.getUnifiedProposals(req.query);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}
console.log('✅ proposals controller hit');

module.exports = {
  listUnifiedProposals,
};
