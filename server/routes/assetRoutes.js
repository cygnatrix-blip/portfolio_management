// server/routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Import the correct controller
const { 
  searchStocks, 
  searchMutualFunds 
} = require('../controllers/assetController');

// All routes here should be protected
router.use(protect);

// @route   GET /api/assets/search-stocks
// @desc    Search for stocks via Yahoo Finance
router.get('/search-stocks', searchStocks);

// @route   GET /api/assets/search-mf
// @desc    Search for mutual funds from local DB
router.get('/search-mf', searchMutualFunds);

module.exports = router;