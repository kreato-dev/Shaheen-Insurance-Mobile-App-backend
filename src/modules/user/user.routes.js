// src/modules/user/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { authMiddleware } = require('./../../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for Profile Pictures
// projectRoot is ../../../uploads relative to this file
const uploadDir = path.join(__dirname, '../../../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// GET /api/user/profile
router.get('/profile',authMiddleware, userController.getProfile);

// PUT /api/user/profile
router.put('/profile',authMiddleware, userController.updateProfile);

// POST /api/user/profile-picture
router.post('/profile-picture', authMiddleware, upload.single('profilePicture'), userController.uploadProfilePicture);

module.exports = router;
