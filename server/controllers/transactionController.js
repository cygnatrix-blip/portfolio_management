const db = require('../config/db');

// @desc    Process a new unified transaction (now with automated cash handling)
// @route   POST /api/transactions
const createTransaction = async (req, res) => {
    // Add a new 'price' field to the data we receive from the form
    const { type, clientId, amount, ticker, quantity, price } = req.body;

    const client = await db.query('BEGIN'); // Start a database transaction for safety

    try {
        let resultData;
        
        // --- 1. DEPOSIT LOGIC (Unchanged) ---
        if (type === 'DEPOSIT') {
            if (!clientId || !amount) throw new Error('Client ID and Amount are required.');
            
            const lastNavResult = await db.query('SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1');
            let latestNAV = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].nav_value) : 10.0;
            let totalUnits = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].total_units_outstanding) : 0;
            let totalValue = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].total_portfolio_value) : 0;
            
            const newUnits = parseFloat(amount) / latestNAV;
            const newTotalUnits = totalUnits + newUnits;
            const newTotalValue = totalValue + parseFloat(amount);
            
            await db.query('INSERT INTO units_ledger (client_id, transaction_type, amount, units) VALUES ($1, $2, $3, $4)', [clientId, type, amount, newUnits]);
            
            await db.query(`
                INSERT INTO master_holdings (ticker, quantity) VALUES ('CASH', $1)
                ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $1
            `, [amount]);
            
            const navSql = `
                INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
                VALUES (CURRENT_DATE, $1, $2, $3)
                ON CONFLICT (nav_date) DO UPDATE SET total_portfolio_value = $2, total_units_outstanding = $3 RETURNING *;`;
            const { rows } = await db.query(navSql, [latestNAV, newTotalValue, newTotalUnits]);
            resultData = { navUpdate: rows[0] };
        } 
        
        // --- 2. WITHDRAWAL LOGIC (Unchanged) ---
        else if (type === 'WITHDRAWAL') {
            if (!clientId || !amount) throw new Error('Client ID and Amount are required.');

            const cashResult = await db.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH'");
            const cashBalance = cashResult.rows.length > 0 ? parseFloat(cashResult.rows[0].quantity) : 0;
            if (cashBalance < parseFloat(amount)) {
                throw new Error('Insufficient cash for withdrawal. Sell assets to raise cash first.');
            }

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
            
            const navSql = `
                INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
                VALUES (CURRENT_DATE, $1, $2, $3)
                ON CONFLICT (nav_date) DO UPDATE SET total_portfolio_value = $2, total_units_outstanding = $3 RETURNING *;`;
            const { rows } = await db.query(navSql, [latestNAV, newTotalValue, newTotalUnits]);
            resultData = { navUpdate: rows[0] };
        }
        
        // --- 3. BUY ASSET LOGIC (Updated to log the transaction) ---
        else if (type === 'BUY') {
            if (!ticker || !quantity || !price) throw new Error('Ticker, Quantity, and Price are required.');
            const totalCost = parseFloat(quantity) * parseFloat(price);

            const cashResult = await db.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH'");
            const cashBalance = cashResult.rows.length > 0 ? parseFloat(cashResult.rows[0].quantity) : 0;
            if (cashBalance < totalCost) {
                throw new Error(`Insufficient cash. Need ${totalCost}, but only have ${cashBalance}.`);
            }

            await db.query(`
                INSERT INTO master_holdings (ticker, quantity) VALUES ($1, $2)
                ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $2
            `, [ticker.toUpperCase(), quantity]);

            // --- NEW: Log this asset transaction ---
            await db.query(`
                INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value)
                VALUES ('BUY', $1, $2, $3, $4)
            `, [ticker.toUpperCase(), quantity, price, totalCost]);

            const { rows } = await db.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = \'CASH\' RETURNING *', [totalCost]);
            resultData = { cashUpdate: rows[0] };
        } 

        // --- 4. SELL ASSET LOGIC (Updated to log the transaction) ---
        else if (type === 'SELL') {
            if (!ticker || !quantity || !price) throw new Error('Ticker, Quantity, and Price are required.');
            const totalProceeds = parseFloat(quantity) * parseFloat(price);

            await db.query(`
                UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2
            `, [quantity, ticker.toUpperCase()]);

            // --- NEW: Log this asset transaction ---
            await db.query(`
                INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value)
                VALUES ('SELL', $1, $2, $3, $4)
            `, [ticker.toUpperCase(), quantity, price, totalProceeds]);

            const { rows } = await db.query(`
                INSERT INTO master_holdings (ticker, quantity) VALUES ('CASH', $1)
                ON CONFLICT (ticker) DO UPDATE SET quantity = master_holdings.quantity + $1
                RETURNING *;
            `, [totalProceeds]);
            resultData = { cashUpdate: rows[0] };
        }
        
        else {
            throw new Error('Invalid transaction type specified.');
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