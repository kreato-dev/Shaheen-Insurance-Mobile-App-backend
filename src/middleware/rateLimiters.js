const rateLimit = require('express-rate-limit');

// Limit for sending OTPs (Register, Resend, Forgot Password)
const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 OTP send requests per windowMs
  message: { message: 'Too many OTP requests, please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for verifying OTPs (Brute-force protection)
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: { message: 'Too many verification attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for login attempts (Brute-force protection)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  message: { message: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpSendLimiter, otpVerifyLimiter, loginLimiter };