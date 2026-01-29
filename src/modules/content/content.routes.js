const router = require('express').Router();
const ctrl = require('./content.controller');

router.get('/banners', ctrl.getBanners);

module.exports = router;