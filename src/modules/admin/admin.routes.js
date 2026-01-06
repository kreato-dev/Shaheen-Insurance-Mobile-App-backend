// src/modules/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const proposalsRoutes = require('./proposals/proposals.routes');
const adminAuthRoutes = require('./auth/adminAuth.routes');
const refundsRoutes = require('./refunds/refunds.routes');
const usersRoutes = require('./users/users.routes')

router.use('/auth', adminAuthRoutes );

router.use('/proposals', proposalsRoutes );

router.use('/refunds', refundsRoutes);

router.use('/users', usersRoutes);

module.exports = router;
