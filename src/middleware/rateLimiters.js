const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Limit for sending OTPs (Register, Resend)
const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 4, // Limit each IP to 4 OTP send requests per windowMs
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
  max: 5, // Limit each user (by mobile) to 5 failed login requests per windowMs
  message: { message: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests (status >= 400)
  keyGenerator: (req, res) => {
    return req.body.mobile || ipKeyGenerator(req, res); // Use mobile number as key, fallback to IP
  },
});

// Limit for sending OTPs (Forgot Password, Resend Password)
const forgotPassSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 4, // Limit each IP to 4 requests for the forgot password flow per windowMs
  message: { message: 'Too many forgot password attempts, please try again after 10 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit for verifying OTPs (Brute-force protection)
const forgotPassVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 verification attempts per windowMs
  message: { message: 'Too many verification attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpSendLimiter, otpVerifyLimiter, loginLimiter, forgotPassSendLimiter, forgotPassVerifyLimiter };