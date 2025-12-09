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

// Send OTP for forgot password
async function sendForgotPasswordOtp(req, res, next) {
  try {
    const { mobile } = req.body;

    const result = await authService.sendForgotPasswordOtp({ mobile });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// Verify OTP & reset password
async function verifyForgotPasswordOtp(req, res, next) {
  try {
    const { mobile, otp, newPassword } = req.body;

    const result = await authService.verifyForgotPasswordOtp({
      mobile,
      otp,
      newPassword,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
};
