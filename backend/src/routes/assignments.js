const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// @route GET /api/v1/assignments/my
router.get('/my', assignmentController.getMyAssignments);

module.exports = router;
