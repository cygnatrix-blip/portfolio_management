const express = require('express');
const router = express.Router();
const { getOverallDashboard, getPortfolioDashboard } = require('../controllers/dashboardController');
const { protect, isInvestor } = require('../middleware/authMiddleware');

// All routes in this file are for INVESTORS ONLY
router.use(protect, isInvestor);

// @route   GET /api/dashboard/overall
// @desc    Get the overall dashboard (summary of all portfolios)
router.get('/overall', getOverallDashboard);

// @route   GET /api/dashboard/portfolio/:id
// @desc    Get the detailed dashboard for a single portfolio
router.get('/portfolio/:id', getPortfolioDashboard);

module.exports = router;