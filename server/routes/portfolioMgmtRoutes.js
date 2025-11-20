const express = require('express');
const router = express.Router();
const { protect, isInvestor } = require('../middleware/authMiddleware');

// This imports from the *renamed* controller
const {
  getHoldings,
  addOrUpdateHolding,
  updateManualNav
} = require('../controllers/portfolioMgmtController');

// All portfolio management routes are for investors only
router.use(protect, isInvestor);

// @route   GET /api/portfolio-mgmt/:id/holdings
// @desc    Get all master holdings for a specific portfolio
router.get('/:id/holdings', getHoldings);

// @route   POST /api/portfolio-mgmt/:id/holdings
// @desc    DEPRECATED: Add or update a holding (use /api/transactions)
router.post('/:id/holdings', addOrUpdateHolding);

// @route   POST /api/portfolio-mgmt/:id/nav
// @desc    Manually update the NAV for a specific portfolio
router.post('/:id/nav', updateManualNav);

module.exports = router;