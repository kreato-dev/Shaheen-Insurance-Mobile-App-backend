// src/modules/claim/claim.controller.js

async function getClaims(req, res, next) {
  try {
    // TODO: fetch claim history from core API or cache
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getClaims };
