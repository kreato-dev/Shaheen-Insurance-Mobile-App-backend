// src/modules/user/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('./user.controller');

// GET /api/user/profile
router.get('/profile', userController.getProfile);

// PUT /api/user/profile
router.put('/profile', userController.updateProfile);

module.exports = router;
