const db = require('../config/db');

// @desc    Process a new unified transaction (now with automated cash handling)
// @route   POST /api/transactions
// transactionController.js

const createTransaction = async (req, res) => {
    const client = await db.query('BEGIN'); // Start transaction

    try {
        // --- THE DEFINITIVE FIX ---
        // Intelligently determine the transaction type from either field name.
        const type = req.body.transaction_type || req.body.type;
        
        // Destructure all possible fields. Some will be undefined depending on the action, which is okay.
        const { 
            ticker, 
            quantity, 
            price_per_share, 
            total_value, 
            clientId, 
            amount 
        } = req.body;

        let resultData;

        // --- 1. DEPOSIT LOGIC (Now works correctly) ---
        if (type === 'DEPOSIT') {
            if (!clientId || !amount) throw new Error('Client ID and Amount are required for DEPOSIT.');
            const lastNavResult = await db.query('SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1');
            let latestNAV = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].nav_value) : 10.0;
            let totalUnits = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].total_units_outstanding) : 0;
            let totalValue = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].total_portfolio_value) : 0;
            const newUnits = parseFloat(amount) / latestNAV;
            const newTotalUnits = totalUnits + newUnits;
            const newTotalValue = totalValue + parseFloat(amount);
            await db.query('INSERT INTO units_ledger (client_id, transaction_type, amount, units) VALUES ($1, $2, $3, $4)', [clientId, type, amount, newUnits]);
            await db.query(`INSERT INTO master_holdings (ticker, quantity) VALUES ('CASH', $1) ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $1`, [amount]);
            const { rows } = await db.query(`INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding) VALUES (CURRENT_DATE, $1, $2, $3) ON CONFLICT (nav_date) DO UPDATE SET total_portfolio_value = $2, total_units_outstanding = $3 RETURNING *;`, [latestNAV, newTotalValue, newTotalUnits]);
            resultData = { navUpdate: rows[0] };
        } 
        
        // --- 2. WITHDRAWAL LOGIC (Now works correctly) ---
        else if (type === 'WITHDRAWAL') {
            if (!clientId || !amount) throw new Error('Client ID and Amount are required for WITHDRAWAL.');
            const cashResult = await db.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH'");
            const cashBalance = cashResult.rows.length > 0 ? parseFloat(cashResult.rows[0].quantity) : 0;
            if (cashBalance < parseFloat(amount)) throw new Error('Insufficient cash for withdrawal.');
            const lastNavResult = await db.query('SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1');
            if (lastNavResult.rows.length === 0) throw new Error('No NAV history found.');
            const latestNAV = parseFloat(lastNavResult.rows[0].nav_value);
            const totalUnits = parseFloat(lastNavResult.rows[0].total_units_outstanding);
            const totalValue = parseFloat(lastNavResult.rows[0].total_portfolio_value);
            const unitsToRedeem = parseFloat(amount) / latestNAV;
            const newTotalUnits = totalUnits - unitsToRedeem;
            const newTotalValue = totalValue - parseFloat(amount);
            await db.query('INSERT INTO units_ledger (client_id, transaction_type, amount, units) VALUES ($1, $2, $3, $4)', [clientId, type, amount, unitsToRedeem]);
            await db.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = \'CASH\'', [amount]);
            const { rows } = await db.query(`INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding) VALUES (CURRENT_DATE, $1, $2, $3) ON CONFLICT (nav_date) DO UPDATE SET total_portfolio_value = $2, total_units_outstanding = $3 RETURNING *;`, [latestNAV, newTotalValue, newTotalUnits]);
            resultData = { navUpdate: rows[0] };
        }
        
        // --- 3. BUY ASSET LOGIC (Still correct) ---
        else if (type === 'BUY') {
            if (!ticker || !quantity || !price_per_share) throw new Error('Ticker, Quantity, and Price are required for BUY.');
            const totalCost = parseFloat(total_value);
            const cashResult = await db.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH'");
            const cashBalance = cashResult.rows.length > 0 ? parseFloat(cashResult.rows[0].quantity) : 0;
            if (cashBalance < totalCost) throw new Error(`Insufficient cash. Need ${totalCost}, have ${cashBalance}.`);
            await db.query(`INSERT INTO master_holdings (ticker, quantity) VALUES ($1, $2) ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [ticker.toUpperCase(), quantity]);
            await db.query(`INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value) VALUES ('BUY', $1, $2, $3, $4)`, [ticker.toUpperCase(), quantity, price_per_share, totalCost]);
            const { rows } = await db.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = \'CASH\' RETURNING *', [totalCost]);
            resultData = { cashUpdate: rows[0] };
        } 

        // --- 4. SELL ASSET LOGIC (Still correct) ---
        else if (type === 'SELL') {
            if (!ticker || !quantity || !price_per_share) throw new Error('Ticker, Quantity, and Price are required for SELL.');
            const totalProceeds = parseFloat(total_value);
            await db.query(`UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2`, [quantity, ticker.toUpperCase()]);
            await db.query(`INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value) VALUES ('SELL', $1, $2, $3, $4)`, [ticker.toUpperCase(), quantity, price_per_share, totalProceeds]);
            const { rows } = await db.query(`INSERT INTO master_holdings (ticker, quantity) VALUES ('CASH', $1) ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $1 RETURNING *;`, [totalProceeds]);
            resultData = { cashUpdate: rows[0] };
        }
        
        else {
            throw new Error(`Invalid transaction type specified: ${type}`);
        }

        await db.query('COMMIT');
        res.status(201).json({ success: true, data: resultData, message: `Transaction (${type}) successful.` });

    } catch (err) {
        await db.query('ROLLBACK');
        res.status(400).json({ success: false, message: err.message });
    }
};
// --- NEW: Function to get asset transactions with pagination ---
const getAssetTransactions = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25; // Default to 25 items per page
        const offset = (page - 1) * limit;

        const transactionsResult = await db.query(
            'SELECT * FROM asset_transactions ORDER BY transaction_date DESC LIMIT $1 OFFSET $2',
            [limit, offset]
        );

        const totalResult = await db.query('SELECT COUNT(*) FROM asset_transactions');
        
        res.json({
            transactions: transactionsResult.rows,
            totalItems: parseInt(totalResult.rows[0].count),
            currentPage: page,
            totalPages: Math.ceil(totalResult.rows[0].count / limit),
        });
    } catch (err) {
        console.error('DB Error in getAssetTransactions:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createTransaction,
    getAssetTransactions, // <-- Export the new function
};