const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const threatController = require('../controllers/threatController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// @route GET /api/v1/threats
router.get('/', threatController.getAllThreats);

// @route POST /api/v1/threats
router.post('/', authorize('admin', 'analyst'), [
  body('title').trim().notEmpty(),
  body('description').trim().notEmpty(),
  body('threat_type').isIn(['malware', 'ransomware', 'phishing', 'botnet', 'zero_day', 'credential_attack', 'ddos', 'apt', 'other']),
  body('severity').isIn(['low', 'medium', 'high', 'critical'])
], threatController.createThreat);

// @route GET /api/v1/threats/:id
router.get('/:id', threatController.getThreatById);

// @route PUT /api/v1/threats/:id
router.put('/:id', authorize('admin', 'analyst'), threatController.updateThreat);

// @route DELETE /api/v1/threats/:id
router.delete('/:id', authorize('admin'), threatController.deleteThreat);

module.exports = router;
