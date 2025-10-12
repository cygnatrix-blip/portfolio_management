const express = require('express');
const router = express.Router();
const { adminCreateClient, adminResetPassword } = require('../controllers/adminController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   POST /api/admin/users
// @desc    Admin creates a new client with a password
// @access  Private/Admin
// Note: This route is protected. A user must be logged in AND have an 'admin' role.
router.post('/users', protect, isAdmin, adminCreateClient);

// @route   PUT /api/admin/users/reset-password
// @desc    Admin resets a client's password
// @access  Private/Admin
router.put('/users/reset-password', protect, isAdmin, adminResetPassword);

module.exports = router;

