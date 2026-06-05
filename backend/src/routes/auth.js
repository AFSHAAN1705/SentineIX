const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const registerValidation = [
  body('fullName').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// @route POST /api/v1/auth/register
router.post('/register', authLimiter, registerValidation, authController.register);

// @route POST /api/v1/auth/login
router.post('/login', authLimiter, loginValidation, authController.login);

// @route POST /api/v1/auth/refresh
router.post('/refresh', authController.refresh);

// @route POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

// @route POST /api/v1/auth/forgot-password
router.post('/forgot-password', authLimiter, body('email').isEmail(), authController.forgotPassword);

// @route POST /api/v1/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// @route GET /api/v1/auth/me
router.get('/me', authenticate, authController.getMe);

module.exports = router;
