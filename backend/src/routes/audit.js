const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

// @route GET /api/v1/audit
router.get('/', auditController.getAuditLogs);

module.exports = router;
