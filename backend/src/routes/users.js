const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/multer');

router.use(authenticate);

// @route GET /api/v1/users/stats
router.get('/stats', authorize('admin'), userController.getUserStats);

// @route GET /api/v1/users
router.get('/', authorize('admin', 'analyst'), userController.getAllUsers);

// @route POST /api/v1/users
router.post('/', authorize('admin'), userController.createUser);

// @route GET /api/v1/users/:id
router.get('/:id', userController.getUserById);

// @route PUT /api/v1/users/:id
router.put('/:id', userController.updateUser);

// @route PATCH /api/v1/users/:id/deactivate
router.patch('/:id/deactivate', authorize('admin'), userController.deactivateUser);

// @route POST /api/v1/users/change-password
router.post('/change-password', userController.changePassword);

// @route POST /api/v1/users/avatar
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);

module.exports = router;
