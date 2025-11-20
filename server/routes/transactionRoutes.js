// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createTransaction, 
    getAssetTransactions, 
    getLedgerTransactions,
    getAssetTransactionsByTicker,
    updateAssetTransaction, // <-- NEW
    updateLedgerTransaction // <-- NEW
} = require('../controllers/transactionController');
const { protect, isInvestor } = require('../middleware/authMiddleware');

// All routes in this file are for INVESTORS ONLY
router.use(protect, isInvestor);

// Create
router.post('/', createTransaction);

// Read
router.get('/:portfolioId', getAssetTransactions);
router.get('/ledger/:portfolioId', getLedgerTransactions);
router.get('/:portfolioId/ticker/:ticker', getAssetTransactionsByTicker);

// Update (NEW)
router.put('/asset/:id', updateAssetTransaction);   // For BUY/SELL
router.put('/ledger/:id', updateLedgerTransaction); // For DEPOSIT/WITHDRAWAL

module.exports = router;