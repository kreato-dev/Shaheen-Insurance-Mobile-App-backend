// src/modules/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const proposalsRoutes = require('./proposals/proposals.routes');
const adminAuthRoutes = require('./auth/adminAuth.routes');
const refundsRoutes = require('./refunds/refunds.routes');
const usersRoutes = require('./users/users.routes')
const policiesRoutes = require('./policies/admin.policy.routes')
const policyRenewralRoutes = require('./policies/admin.policy.renewal.routes')
const adminMotorClaimsRoutes = require('./claims/motor/admin.claim.motor.routes');

router.use('/auth', adminAuthRoutes );

router.use('/proposals', proposalsRoutes );

router.use('/refunds', refundsRoutes);

router.use('/users', usersRoutes);

router.use('/policies', policiesRoutes, policyRenewralRoutes);

router.use('/claims/motor', adminMotorClaimsRoutes);

module.exports = router;
