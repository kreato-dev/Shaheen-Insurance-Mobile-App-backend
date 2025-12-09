// src/modules/auth/auth.controller.js

// Register a new user
async function register(req, res, next) {
  try {
    // TODO: validate body, hash password, save user, generate JWT
    return res.status(201).json({ message: 'User registered (stub)' });
  } catch (err) {
    next(err);
  }
}

// Login user
async function login(req, res, next) {
  try {
    // TODO: validate body, check credentials, return JWT
    return res.json({ message: 'Login success (stub)' });
  } catch (err) {
    next(err);
  }
}

// Send OTP for forgot password
async function sendForgotPasswordOtp(req, res, next) {
  try {
    // TODO: generate OTP, save, send via SMS provider / log
    return res.json({ message: 'OTP sent (stub)' });
  } catch (err) {
    next(err);
  }
}

// Verify OTP & reset password
async function verifyForgotPasswordOtp(req, res, next) {
  try {
    // TODO: check OTP, update password
    return res.json({ message: 'Password reset success (stub)' });
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
