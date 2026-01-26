// src/modules/notifications/notification.routes.js
const router = require('express').Router();
const c = require('./notification.controller');


// User
router.get('/', c.listUser);
router.patch('/:id/read', c.readOneUser);
router.patch('/read-all', c.readAllUser);

module.exports = router;