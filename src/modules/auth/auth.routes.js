// src/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authMiddleware } = require('./../../middleware/auth');

// POST /api/auth/register
router.post('/register', authController.register);

// NEW: POST /api/auth/verify-email-otp
router.post('/verify-email-otp', authController.verifyEmailOtp);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout
router.post('/logout', authMiddleware, authController.logout);

// Forgot password (EMAIL ONLY now)
// POST /api/auth/forgot-password/otp
router.post('/forgot-password/otp', authController.sendForgotPasswordOtp);

// POST /api/auth/resend-email-otp
router.post('/resend-email-otp', authController.resendEmailOtp);

// POST /api/auth/forgot-password/verify (Step 1: Verify OTP)
router.post('/forgot-password/verify', authController.verifyForgotPasswordOtp);

// POST /api/auth/forgot-password/reset (Step 2: Reset Password)
router.post('/forgot-password/reset', authController.resetPasswordWithOtp);

// POST /api/auth/fcm-token (Protected: Auth middleware required since router is public)
router.post('/fcm-token', authMiddleware, authController.saveFcmToken);

// DELETE /api/auth/fcm-token (Protected: Auth middleware required since router is public)
router.delete('/fcm-token', authMiddleware, authController.removeFcmToken);

module.exports = router;
