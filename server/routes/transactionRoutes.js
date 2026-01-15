// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createTransaction, 
    getAssetTransactions, 
    getLedgerTransactions,
    getAssetTransactionsByTicker,
    updateAssetTransaction,
    updateLedgerTransaction,
    deleteAssetTransaction, // NEW
    deleteLedgerTransaction // NEW
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

// Update
router.put('/asset/:id', updateAssetTransaction);
router.put('/ledger/:id', updateLedgerTransaction);

// Delete (NEW)
router.delete('/asset/:id', deleteAssetTransaction);
router.delete('/ledger/:id', deleteLedgerTransaction);

module.exports = router;