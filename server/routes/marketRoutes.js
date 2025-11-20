const express = require('express');
const router = express.Router();
const { getMarketIndices } = require('../controllers/marketController');
const { protect } = require('../middleware/authMiddleware');

// Protect this route
router.get('/indices', protect, getMarketIndices);

module.exports = router;