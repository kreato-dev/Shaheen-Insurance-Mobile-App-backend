const express = require('express');
const router = express.Router();

const controller = require('./proposals.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const rbac = require('../../../middleware/rbac.middleware');

// Phase 1 — Unified Proposals Inbox
router.get(
  '/',
  requireAdmin,
  adminSession(),
  rbac('PROPOSALS:READ'),
  controller.listUnifiedProposals
);

module.exports = router;
