const express = require('express');
const router = express.Router();
const { protect, isInvestor } = require('../middleware/authMiddleware');
const { 
    getPortfolios, 
    createPortfolio, 
    deletePortfolio 
} = require('../controllers/portfolioController');

// All routes in this file are for INVESTORS ONLY
router.use(protect, isInvestor);

// @route   GET /api/portfolios
// @desc    Get all portfolios for the logged-in investor
router.get('/', getPortfolios);

// @route   POST /api/portfolios
// @desc    Create a new, initialized portfolio for the logged-in investor
router.post('/', createPortfolio);

// @route   DELETE /api/portfolios/:id
// @desc    Delete one of the investor's portfolios
router.delete('/:id', deletePortfolio);

module.exports = router;