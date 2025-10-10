const express = require('express');
const router = express.Router();
const { getNifty50Data, fetchNifty50Data } = require('../controllers/marketController');
const { protect } = require('../middleware/authMiddleware');

// Protected routes - require valid JWT token
router.get('/nifty50', protect, getNifty50Data);
router.get('/nifty50/refresh', protect, fetchNifty50Data); // Force refresh from API

module.exports = router;