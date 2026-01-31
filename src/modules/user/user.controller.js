// src/modules/user/user.controller.js
const userService = require('../user/user.service'); // reuse profile helpers

async function getProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const profile = await userService.getUserProfile(userId);
    return res.json({ data: profile });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const updated = await userService.updateUserProfile(userId, req.body);
    return res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}

async function uploadProfilePicture(req, res, next) {
  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    // Store relative path: uploads/profiles/filename.jpg
    const relativePath = `uploads/profiles/${req.file.filename}`;
    const userId = req.user.id;
    const updated = await userService.updateProfilePicture(userId, relativePath);
    return res.json({ data: updated, message: 'Profile picture uploaded successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadProfilePicture };
