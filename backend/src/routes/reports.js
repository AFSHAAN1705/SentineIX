const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// @route GET /api/v1/reports/analytics
router.get('/analytics', authorize('admin', 'analyst'), reportController.getAnalyticsDashboard);

// @route GET /api/v1/reports/export/csv
router.get('/export/csv', authorize('admin', 'analyst'), reportController.exportCSV);

// @route GET /api/v1/reports/export/pdf
router.get('/export/pdf', authorize('admin', 'analyst'), reportController.exportPDF);

module.exports = router;
