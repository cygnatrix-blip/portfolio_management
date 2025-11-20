const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Public route for anyone to register as an 'investor'
router.post('/register', registerUser);

// @route   POST /api/auth/login
// @desc    Public route for any user (admin or investor) to log in
router.post('/login', loginUser);

module.exports = router;