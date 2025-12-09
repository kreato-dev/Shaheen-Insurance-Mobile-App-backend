// src/modules/user/user.controller.js
const authService = require('../auth/auth.service'); // reuse profile helpers

async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await authService.getUserProfile(userId);
    return res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const updated = await authService.updateUserProfile(userId, req.body);
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };
