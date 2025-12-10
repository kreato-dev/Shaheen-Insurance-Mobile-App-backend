// src/modules/admin/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');

// GET /api/admin/dashboard/summary
router.get('/dashboard/summary', adminController.getSummary);

// GET /api/admin/motor-proposals?status=&page=&limit=
router.get('/motor-proposals', adminController.listMotorProposals);

// GET /api/admin/travel-proposals?status=&page=&limit=
router.get('/travel-proposals', adminController.listTravelProposals);

// GET /api/admin/payments?status=&fromDate=&toDate=&page=&limit=
router.get('/payments', adminController.listPayments);

module.exports = router;
