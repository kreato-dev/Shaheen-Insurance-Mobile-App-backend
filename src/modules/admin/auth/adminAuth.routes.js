const router = require('express').Router();
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const ctrl = require('./adminAuth.controller');

router.post('/login', ctrl.login);
router.post('/forgot-password/otp', ctrl.sendForgotPasswordOtp);
router.post('/forgot-password/reset', ctrl.resetPasswordWithOtp);
router.post('/logout', requireAdmin, adminSession(), ctrl.logout);
router.get('/me', requireAdmin, adminSession(), ctrl.me);
router.post('/change-password', requireAdmin, adminSession(), ctrl.changePassword);

router.post('/fcm-token', requireAdmin, adminSession(), ctrl.saveFcmToken);
router.delete('/fcm-token', requireAdmin, adminSession(), ctrl.removeFcmToken);

module.exports = router;
