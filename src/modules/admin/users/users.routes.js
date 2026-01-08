const express = require('express');
const router = express.Router();

const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

const usersController = require('./users.controller');

router.get(
  '/',
  requireAdmin,
  requirePermission('USERS:READ'),
  usersController.listUsers
);

router.get(
  '/:id',
  requireAdmin,
  requirePermission('USERS:READ'),
  usersController.getUserById
);

router.patch(
  '/:id/status',
  requireAdmin,
  requirePermission('USERS:READ'), // keep READ for Support, but restrict inside controller OR change to CONFIG/OPS perm
  usersController.updateUserStatus
);

// Support flow: initiate reset via OTP email
router.post(
  '/:id/password-reset/initiate',
  requireAdmin,
  requirePermission('USERS:RESET'),
  usersController.initiateUserPasswordReset
);

router.get(
  '/user-proposal-list/:id',
  requireAdmin,
  requirePermission('USERS:READ'),
   usersController.getProposalsFeedofUser);


module.exports = router;
