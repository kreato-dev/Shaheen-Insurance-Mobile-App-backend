// src/modules/claim/claim.controller.js
const { getClaimsForUser } = require('./claim.service');

async function getClaims(req, res, next) {
  try {
    const userId = req.user.id;
    const claims = await getClaimsForUser(userId);
    return res.json({ data: claims });
  } catch (err) {
    next(err);
  }
}

module.exports = { getClaims };
