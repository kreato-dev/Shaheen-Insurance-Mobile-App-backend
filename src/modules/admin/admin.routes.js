// src/modules/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const proposalsRoutes = require('./proposals/proposals.routes');
const adminAuthRoutes = require('./auth/adminAuth.routes');

router.use('/auth', adminAuthRoutes );

router.use('/proposals', proposalsRoutes );
module.exports = router;
