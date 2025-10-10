const express = require('express');
const router = express.Router();
// --- Import the new function ---
const { createTransaction, getAssetTransactions } = require('../controllers/transactionController');

// @route   POST /api/transactions
// @desc    Handles all transaction types (Deposit, Withdraw, Buy, Sell)
router.post('/', createTransaction);

// --- NEW ROUTE ---
// @route   GET /api/transactions/assets
// @desc    Get all asset buy/sell transaction history (with pagination)
router.get('/assets', getAssetTransactions);

module.exports = router;