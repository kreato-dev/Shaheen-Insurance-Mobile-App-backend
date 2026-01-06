// src/modules/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const proposalsRoutes = require('./proposals/proposals.routes');
const adminAuthRoutes = require('./auth/adminAuth.routes');
const refundsRoutes = require('./refunds/refunds.routes');

router.use('/auth', adminAuthRoutes );

router.use('/proposals', proposalsRoutes );

router.use('/refunds', refundsRoutes);

module.exports = router;
