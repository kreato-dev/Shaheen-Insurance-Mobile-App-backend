// src/modules/user/user.controller.js

async function getProfile(req, res, next) {
  try {
    // TODO: fetch from users table using req.user.id
    return res.json({ message: 'Profile data (stub)' });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    // TODO: update address, city, cnic, email for req.user.id
    return res.json({ message: 'Profile updated (stub)' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile };
