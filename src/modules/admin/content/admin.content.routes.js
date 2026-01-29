const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ctrl = require('./admin.content.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// Configure Multer for Content
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../../uploads/content');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Routes
router.get('/', requireAdmin, adminSession(), requirePermission('CONTENT:MANAGE'), ctrl.list);
router.post('/', requireAdmin, adminSession(), requirePermission('CONTENT:MANAGE'), upload.single('image'), ctrl.create);
router.put('/:id', requireAdmin, adminSession(), requirePermission('CONTENT:MANAGE'), upload.single('image'), ctrl.update);
router.delete('/:id', requireAdmin, adminSession(), requirePermission('CONTENT:MANAGE'), ctrl.delete);

module.exports = router;