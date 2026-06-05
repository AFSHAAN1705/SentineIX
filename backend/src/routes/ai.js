const express = require('express');
const router = express.Router();
const { chatWithAI } = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');

// Allow admins and analysts to chat with the AI
router.post('/chat', authenticate, authorize('admin', 'analyst'), chatWithAI);

module.exports = router;
