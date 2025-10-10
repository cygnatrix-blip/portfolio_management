const express = require('express');
const router = express.Router();
const { registerClient, loginClient } = require('../controllers/authController');

// @route   POST /api/auth/register
router.post('/register', registerClient);

// @route   POST /api/auth/login
router.post('/login', loginClient);

module.exports = router;