// src/modules/auth/auth.controller.js
const authService = require('./auth.service');

// Register a new user
async function register(req, res, next) {
  try {
    const { fullName, email, mobile, password } = req.body;

    const result = await authService.registerUser({
      fullName,
      email,
      mobile,
      password,
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// NEW: Verify email OTP
async function verifyEmailOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    const result = await authService.verifyEmailOtpService({
      email,
      otp,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Resend OTP (email verify OR forgot password)
async function resendEmailOtp(req, res, next) {
  try {
    const { email, purpose, mobile } = req.body;

    const result = await authService.resendEmailOtpService({
      email,
      purpose, // "email_verify" or "forgot_password"
      mobile,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Login user
async function login(req, res, next) {
  try {
    const { mobile, password } = req.body;

    const result = await authService.loginUser({
      mobile,
      password,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Send OTP for forgot password (EMAIL ONLY)
async function sendForgotPasswordOtp(req, res, next) {
  try {
    const { email, mobile } = req.body;

    const result = await authService.sendForgotPasswordOtp({ email, mobile });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Verify OTP & reset password (EMAIL ONLY)
async function verifyForgotPasswordOtp(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;

    const result = await authService.verifyForgotPasswordOtp({
      email,
      otp,
      newPassword,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Save FCM Token (Protected)
async function saveFcmToken(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token, deviceId, platform } = req.body;

    const result = await authService.saveFcmToken({
      userId: req.user.id,
      token,
      deviceId,
      platform,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Remove FCM Token (Protected)
async function removeFcmToken(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { token } = req.body;

    const result = await authService.removeFcmToken({
      userId: req.user.id,
      token,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  verifyEmailOtp,
  resendEmailOtp,
  login,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  saveFcmToken,
  removeFcmToken,
};
