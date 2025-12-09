// src/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/forgot-password/otp
router.post('/forgot-password/otp', authController.sendForgotPasswordOtp);

// POST /api/auth/forgot-password/verify
router.post('/forgot-password/verify', authController.verifyForgotPasswordOtp);

module.exports = router;
