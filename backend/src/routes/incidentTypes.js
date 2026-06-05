const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const incidentTypeController = require('../controllers/incidentTypeController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

// @route GET /api/v1/incident-types
router.get('/', incidentTypeController.getAllTypes);

// @route POST /api/v1/incident-types
router.post('/', authorize('admin'), [
  body('type_name').trim().notEmpty().withMessage('Type name is required'),
  body('severity_weight').optional().isInt({ min: 1, max: 10 })
], incidentTypeController.createType);

// @route PUT /api/v1/incident-types/:id
router.put('/:id', authorize('admin'), incidentTypeController.updateType);

// @route DELETE /api/v1/incident-types/:id
router.delete('/:id', authorize('admin'), incidentTypeController.deleteType);

module.exports = router;
