const express = require('express');
const router = express.Router();
const { updateDailyPrices } = require('../controllers/priceController');

// @route   POST /api/prices
// This tells the server that any POST request to this URL should be handled
// by the updateDailyPrices function.
router.post('/', updateDailyPrices);

module.exports = router;

