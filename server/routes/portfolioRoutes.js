const express = require('express');
const router = express.Router();

// Import all three functions from the controller
const {
  getHoldings,
  addOrUpdateHolding,
  updateNavManually
} = require('../controllers/portfolioController');

// @route   GET /api/portfolio/holdings
// @desc    Get all master holdings
router.get('/holdings', getHoldings);

// @route   POST /api/portfolio/holdings
// @desc    Add or update a holding
router.post('/holdings', addOrUpdateHolding);

// @route   POST /api/portfolio/nav
// @desc    Manually update the NAV for the day
router.post('/nav', updateNavManually);

module.exports = router;
