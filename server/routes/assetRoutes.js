// server/routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const { searchStocks, searchMutualFunds } = require('../controllers/assetController');

// Route for searching stocks via Yahoo Finance
router.get('/search-stocks', searchStocks);

// Route for searching mutual funds from our local DB
router.get('/search-mf', searchMutualFunds);

module.exports = router;