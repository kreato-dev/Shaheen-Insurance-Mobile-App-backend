// src/modules/policy/policy.controller.js
const {
  getPoliciesForUser,
  getPolicyByIdForUser,
} = require('./policy.service');

async function getPolicies(req, res, next) {
  try {
    const userId = req.user.id;
    const policies = await getPoliciesForUser(userId);
    return res.json({ data: policies });
  } catch (err) {
    next(err);
  }
}

async function getPolicyById(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid policy id' });
    }

    const policy = await getPolicyByIdForUser(userId, numericId);
    return res.json({ data: policy });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPolicies, getPolicyById };
