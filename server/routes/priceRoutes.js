const express = require('express');
const router = express.Router();
const { addDailyPrice, getPricesForTicker } = require('../controllers/priceController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Adding prices should be an admin-only (or service-only) task
router.post('/', protect, isAdmin, addDailyPrice);

// Getting prices can be for any logged-in user
router.get('/:ticker', protect, getPricesForTicker);

module.exports = router;