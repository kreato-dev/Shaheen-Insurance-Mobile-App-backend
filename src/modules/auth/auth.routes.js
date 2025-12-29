// src/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');

// POST /api/auth/register
router.post('/register', authController.register);

// NEW: POST /api/auth/verify-email-otp
router.post('/verify-email-otp', authController.verifyEmailOtp);

// POST /api/auth/login
router.post('/login', authController.login);

// Forgot password (EMAIL ONLY now)
// POST /api/auth/forgot-password/otp
router.post('/forgot-password/otp', authController.sendForgotPasswordOtp);

// POST /api/auth/resend-email-otp
router.post('/resend-email-otp', authController.resendEmailOtp);

// POST /api/auth/forgot-password/verify
router.post('/forgot-password/verify', authController.verifyForgotPasswordOtp);

module.exports = router;
