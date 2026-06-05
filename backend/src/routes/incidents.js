const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const incidentController = require('../controllers/incidentController');
const noteController = require('../controllers/noteController');
const evidenceController = require('../controllers/evidenceController');
const assignmentController = require('../controllers/assignmentController');
const resolutionController = require('../controllers/resolutionController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

// All routes require authentication
router.use(authenticate);

// @route GET /api/v1/incidents/stats
router.get('/stats', authorize('admin', 'analyst'), incidentController.getIncidentStats);

// @route GET/POST /api/v1/incidents
router.get('/', incidentController.getAllIncidents);
router.post('/', [
  body('title').trim().isLength({ min: 5, max: 255 }),
  body('description').trim().notEmpty(),
  body('type_id').isInt({ min: 1 }),
  body('severity').isIn(['low', 'medium', 'high', 'critical'])
], incidentController.createIncident);

// @route GET/PUT/DELETE /api/v1/incidents/:id
router.get('/:id', incidentController.getIncidentById);
router.put('/:id', incidentController.updateIncident);
router.delete('/:id', authorize('admin'), incidentController.deleteIncident);

// @route PATCH /api/v1/incidents/:id/status
router.patch('/:id/status', authorize('admin', 'analyst'), [
  body('status').isIn(['open', 'assigned', 'investigating', 'under_review', 'resolved', 'closed'])
], incidentController.updateStatus);

// --- Assignment sub-routes ---
// @route POST /api/v1/incidents/:id/assign
router.post('/:id/assign', authorize('admin', 'analyst'), assignmentController.assignIncident);

// @route GET /api/v1/incidents/:id/assignments
router.get('/:id/assignments', assignmentController.getAssignmentsByIncident);

// --- AI Analysis sub-route ---
// @route POST /api/v1/incidents/:id/ai-analyze
router.post('/:id/ai-analyze', authorize('admin', 'analyst'), incidentController.aiAnalyzeIncident);

// --- Notes sub-routes ---
// @route GET/POST /api/v1/incidents/:id/notes
router.get('/:id/notes', noteController.getNotes);
router.post('/:id/notes', authorize('admin', 'analyst'), [
  body('content').trim().isLength({ min: 1, max: 10000 })
], noteController.addNote);

// @route PUT/DELETE /api/v1/incidents/:id/notes/:noteId
router.put('/:id/notes/:noteId', authorize('admin', 'analyst'), noteController.updateNote);
router.delete('/:id/notes/:noteId', authorize('admin', 'analyst'), noteController.deleteNote);

// --- Evidence sub-routes ---
// @route GET/POST /api/v1/incidents/:id/evidence
router.get('/:id/evidence', evidenceController.getEvidence);
router.post('/:id/evidence', upload.single('file'), evidenceController.uploadEvidence);

// @route DELETE /api/v1/incidents/:id/evidence/:evidenceId
router.delete('/:id/evidence/:evidenceId', evidenceController.deleteEvidence);

// @route GET /api/v1/incidents/:id/evidence/:evidenceId/download
router.get('/:id/evidence/:evidenceId/download', evidenceController.downloadEvidence);

// --- Resolution sub-routes ---
// @route GET/POST /api/v1/incidents/:id/resolution
router.get('/:id/resolution', resolutionController.getResolution);
router.post('/:id/resolution', authorize('admin', 'analyst'), [
  body('resolution_summary').trim().notEmpty(),
  body('resolution_type').isIn(['mitigated', 'contained', 'eradicated', 'false_positive', 'other'])
], resolutionController.createResolution);
router.put('/:id/resolution', authorize('admin', 'analyst'), resolutionController.updateResolution);

module.exports = router;
