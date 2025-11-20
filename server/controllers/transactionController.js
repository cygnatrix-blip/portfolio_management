// server/controllers/transactionController.js
const db = require('../config/db');

/**
 * @desc    Helper to check if user owns the portfolio
 */
const checkPortfolioOwner = async (dbClient, portfolioId, userId) => {
    const { rows } = await dbClient.query('SELECT user_id FROM portfolios WHERE id = $1', [portfolioId]);
    if (rows.length === 0) throw new Error('Portfolio not found.');
    if (rows[0].user_id !== userId) throw new Error('You are not authorized to manage this portfolio.');
    return true;
};

/**
 * @desc    Helper to Recalculate Portfolio Value & NAV Live
 */
const recalculatePortfolioValue = async (dbClient, portfolioId) => {
    // 1. Get all holdings (Cash + Stocks)
    const { rows: holdings } = await dbClient.query(
        'SELECT ticker, quantity FROM master_holdings WHERE portfolio_id = $1',
        [portfolioId]
    );

    let totalValue = 0;

    // 2. Calculate total market value
    for (const h of holdings) {
        if (h.ticker === 'CASH') {
            totalValue += parseFloat(h.quantity);
        } else {
            const cleanTicker = h.ticker.replace('.NS', '');
            const { rows: priceRows } = await dbClient.query(
                'SELECT closing_price FROM daily_prices WHERE ticker = $1 ORDER BY price_date DESC LIMIT 1',
                [cleanTicker]
            );
            const price = priceRows.length > 0 ? parseFloat(priceRows[0].closing_price) : 0;
            totalValue += parseFloat(h.quantity) * price;
        }
    }

    // 3. Get total units outstanding
    const { rows: unitRows } = await dbClient.query(
        `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN units ELSE -units END), 0) as total_units
         FROM units_ledger WHERE portfolio_id = $1`,
        [portfolioId]
    );
    const totalUnits = parseFloat(unitRows[0].total_units);

    // 4. Calculate new NAV
    const newNav = totalUnits > 0 ? totalValue / totalUnits : 10; 

    // 5. Update the NAV history for TODAY
    await dbClient.query(
        `INSERT INTO nav_history (portfolio_id, nav_date, nav_value, total_portfolio_value, total_units_outstanding)
         VALUES ($1, CURRENT_DATE, $2, $3, $4)
         ON CONFLICT (portfolio_id, nav_date) 
         DO UPDATE SET 
            nav_value = EXCLUDED.nav_value,
            total_portfolio_value = EXCLUDED.total_portfolio_value,
            total_units_outstanding = EXCLUDED.total_units_outstanding`,
        [portfolioId, newNav, totalValue, totalUnits]
    );
};

// ... (Keep createTransaction as is from previous step, just pasting it here for completeness) ...
const createTransaction = async (req, res) => {
    // ... (Use your existing createTransaction code here) ...
    // For brevity, I am not pasting the huge createTransaction function again 
    // UNLESS you need it. Assuming you have the working version from our last chat.
    // If you replaced the file, ensure you put the createTransaction logic back.
    // (Refer to the previous correct version I sent you for createTransaction)
     const dbClient = await db.pool.connect(); 
    const userId = req.user.id; 

    const { 
        transaction_type: type,
        ticker, 
        quantity, 
        price_per_share, 
        total_value, 
        portfolio_id,
        amount 
    } = req.body;

    if (!portfolio_id) return res.status(400).json({ success: false, message: 'portfolio_id is required.' });
    if (!type) return res.status(400).json({ success: false, message: 'transaction_type is required.' });

    let portfolioIdInt;
    try { portfolioIdInt = parseInt(portfolio_id, 10); if (isNaN(portfolioIdInt)) throw new Error(); } 
    catch (e) { return res.status(400).json({ success: false, message: 'Invalid portfolio_id.' }); }

    try {
        await dbClient.query('BEGIN'); 
        await checkPortfolioOwner(dbClient, portfolioIdInt, userId);
        let resultData;

        if (type === 'DEPOSIT') {
            if (!amount || parseFloat(amount) <= 0) throw new Error('Positive Amount required.');
            const parsedAmount = parseFloat(amount);
            const lastNavResult = await dbClient.query('SELECT nav_value FROM nav_history WHERE portfolio_id = $1 ORDER BY nav_date DESC LIMIT 1 FOR UPDATE', [portfolioIdInt]);
            let latestNAV = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].nav_value) : 10.00;
            const newUnits = parsedAmount / latestNAV;
            const ledgerRes = await dbClient.query('INSERT INTO units_ledger (portfolio_id, transaction_type, amount, units, transaction_date) VALUES ($1, \'DEPOSIT\', $2, $3, CURRENT_DATE) RETURNING *', [portfolioIdInt, parsedAmount, newUnits]);
            resultData = ledgerRes.rows[0];
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ('CASH', $1, $2) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $1`, [parsedAmount, portfolioIdInt]);

        } else if (type === 'WITHDRAWAL') {
            if (!amount || parseFloat(amount) <= 0) throw new Error('Positive Amount required.');
            const parsedAmount = parseFloat(amount);
            const lastNavResult = await dbClient.query('SELECT nav_value FROM nav_history WHERE portfolio_id = $1 ORDER BY nav_date DESC LIMIT 1 FOR UPDATE', [portfolioIdInt]);
            if (lastNavResult.rows.length === 0) throw new Error('No NAV history found.');
            let latestNAV = parseFloat(lastNavResult.rows[0].nav_value);
            const unitsToRedeem = parsedAmount / latestNAV;
            const clientUnitsResult = await dbClient.query(`SELECT COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN units ELSE -units END), 0) as "totalUnits" FROM units_ledger WHERE portfolio_id = $1`, [portfolioIdInt]);
            if (parseFloat(clientUnitsResult.rows[0].totalUnits) < unitsToRedeem) throw new Error('Insufficient units.');
            const cashResult = await dbClient.query('SELECT quantity FROM master_holdings WHERE ticker = \'CASH\' AND portfolio_id = $1', [portfolioIdInt]);
            if (cashResult.rows.length === 0 || parseFloat(cashResult.rows[0].quantity) < parsedAmount) throw new Error('Insufficient cash.');
            const ledgerRes = await dbClient.query('INSERT INTO units_ledger (portfolio_id, transaction_type, amount, units, transaction_date) VALUES ($1, \'WITHDRAWAL\', $2, $3, CURRENT_DATE) RETURNING *', [portfolioIdInt, parsedAmount, unitsToRedeem]);
            resultData = ledgerRes.rows[0];
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = \'CASH\' AND portfolio_id = $2', [parsedAmount, portfolioIdInt]);

        } else if (type === 'BUY') {
            if (!ticker || !quantity || !price_per_share ) throw new Error('Details required.');
            const parsedQuantity = parseFloat(quantity);
            const parsedPrice = parseFloat(price_per_share);
            const parsedTotalValue = parsedQuantity * parsedPrice;
            const cashResult = await dbClient.query('SELECT quantity FROM master_holdings WHERE ticker = \'CASH\' AND portfolio_id = $1', [portfolioIdInt]);
            if (cashResult.rows.length === 0 || parseFloat(cashResult.rows[0].quantity) < parsedTotalValue) throw new Error('Insufficient cash.');
            const assetRes = await dbClient.query('INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value, portfolio_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [type, ticker.toUpperCase(), parsedQuantity, parsedPrice, parsedTotalValue, portfolioIdInt]);
            resultData = assetRes.rows[0];
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ($1, $2, $3) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [ticker.toUpperCase(), parsedQuantity, portfolioIdInt]);
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = \'CASH\' AND portfolio_id = $2', [parsedTotalValue, portfolioIdInt]);

        } else if (type === 'SELL') {
            if (!ticker || !quantity || !price_per_share ) throw new Error('Details required.');
            const parsedQuantity = parseFloat(quantity);
            const parsedPrice = parseFloat(price_per_share);
            const parsedTotalValue = parsedQuantity * parsedPrice;
            const holdingResult = await dbClient.query('SELECT quantity FROM master_holdings WHERE ticker = $1 AND portfolio_id = $2', [ticker.toUpperCase(), portfolioIdInt]);
            if (holdingResult.rows.length === 0 || parseFloat(holdingResult.rows[0].quantity) < parsedQuantity) throw new Error(`Insufficient holdings.`);
            const assetRes = await dbClient.query('INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value, portfolio_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [type, ticker.toUpperCase(), parsedQuantity, parsedPrice, parsedTotalValue, portfolioIdInt]);
            resultData = assetRes.rows[0];
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2 AND portfolio_id = $3', [parsedQuantity, ticker.toUpperCase(), portfolioIdInt]);
            await dbClient.query('UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = \'CASH\' AND portfolio_id = $2', [parsedTotalValue, portfolioIdInt]);
        }

        await recalculatePortfolioValue(dbClient, portfolioIdInt);
        await dbClient.query('COMMIT');
        res.status(201).json({ success: true, data: resultData, message: `Transaction (${type}) successful.` });
    } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error(`Error in createTransaction:`, err.message);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        dbClient.release(); 
    }
};

// --- NEW: Update Asset Transaction (BUY/SELL) ---
const updateAssetTransaction = async (req, res) => {
    const transactionId = req.params.id;
    const userId = req.user.id;
    const { quantity, price_per_share } = req.body; // We only allow editing qty and price for safety

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');

        // 1. Get Old Transaction
        const oldTxRes = await dbClient.query('SELECT * FROM asset_transactions WHERE id = $1', [transactionId]);
        if (oldTxRes.rows.length === 0) throw new Error('Transaction not found');
        const oldTx = oldTxRes.rows[0];

        await checkPortfolioOwner(dbClient, oldTx.portfolio_id, userId);

        const oldQty = parseFloat(oldTx.quantity);
        const oldTotalVal = parseFloat(oldTx.total_value);
        const newQty = parseFloat(quantity);
        const newPrice = parseFloat(price_per_share);
        const newTotalVal = newQty * newPrice;

        // 2. REVERSE Old Effect
        if (oldTx.transaction_type === 'BUY') {
            // Reverse BUY: Remove Asset, Add Cash back
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2 AND portfolio_id = $3', [oldQty, oldTx.ticker, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [oldTotalVal, oldTx.portfolio_id]);
        } else {
            // Reverse SELL: Add Asset back, Remove Cash
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ($1, $2, $3) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [oldTx.ticker, oldQty, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [oldTotalVal, oldTx.portfolio_id]);
        }

        // 3. APPLY New Effect
        if (oldTx.transaction_type === 'BUY') {
            // Apply New BUY: Add Asset, Deduct Cash
            // Check Cash first
            const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [oldTx.portfolio_id]);
            if (parseFloat(cashRes.rows[0].quantity) < newTotalVal) throw new Error('Insufficient cash for this edit.');
            
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ($1, $2, $3) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [oldTx.ticker, newQty, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [newTotalVal, oldTx.portfolio_id]);
        } else {
            // Apply New SELL: Deduct Asset, Add Cash
            // Check Asset Holdings
            const holdRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = $1 AND portfolio_id = $2", [oldTx.ticker, oldTx.portfolio_id]);
            if (parseFloat(holdRes.rows[0].quantity) < newQty) throw new Error('Insufficient asset holdings for this edit.');

            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2 AND portfolio_id = $3', [newQty, oldTx.ticker, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [newTotalVal, oldTx.portfolio_id]);
        }

        // 4. Update Transaction Record
        await dbClient.query(
            'UPDATE asset_transactions SET quantity = $1, price_per_share = $2, total_value = $3 WHERE id = $4',
            [newQty, newPrice, newTotalVal, transactionId]
        );

        await recalculatePortfolioValue(dbClient, oldTx.portfolio_id);
        await dbClient.query('COMMIT');
        res.json({ success: true, message: 'Transaction updated successfully' });

    } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error('Edit Asset Tx Error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        dbClient.release();
    }
};

// --- NEW: Update Ledger Transaction (DEPOSIT/WITHDRAWAL) ---
const updateLedgerTransaction = async (req, res) => {
    const transactionId = req.params.id;
    const userId = req.user.id;
    const { amount } = req.body; // Only allow editing amount

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');

        const oldTxRes = await dbClient.query('SELECT * FROM units_ledger WHERE id = $1', [transactionId]);
        if (oldTxRes.rows.length === 0) throw new Error('Transaction not found');
        const oldTx = oldTxRes.rows[0];
        const portfolioId = oldTx.portfolio_id;

        await checkPortfolioOwner(dbClient, portfolioId, userId);

        const oldAmount = parseFloat(oldTx.amount);
        const newAmount = parseFloat(amount);
        
        // 1. Find NAV at the time of transaction
        // We search for a NAV record ON or BEFORE the transaction date
        const navRes = await dbClient.query(
            'SELECT nav_value FROM nav_history WHERE portfolio_id = $1 AND nav_date <= $2 ORDER BY nav_date DESC LIMIT 1',
            [portfolioId, oldTx.transaction_date]
        );
        const historicalNAV = navRes.rows.length > 0 ? parseFloat(navRes.rows[0].nav_value) : 10.00;

        const newUnits = newAmount / historicalNAV;
        const oldUnits = parseFloat(oldTx.units);

        // 2. REVERSE Old Effect & APPLY New Effect (Differential)
        // It's safer to calculate the diff
        
        if (oldTx.transaction_type === 'DEPOSIT') {
            // Net change in Cash and Units
            const cashDiff = newAmount - oldAmount; 
            const unitsDiff = newUnits - oldUnits;
            
            // Check if removing cash would go negative
            if (cashDiff < 0) {
                 const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [portfolioId]);
                 if (parseFloat(cashRes.rows[0].quantity) < Math.abs(cashDiff)) throw new Error('Insufficient cash balance to reduce deposit amount.');
            }

            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [cashDiff, portfolioId]);
            
            // We don't update master holdings for units (units are derived), but we update ledger
        } else {
            // WITHDRAWAL
            const cashDiff = newAmount - oldAmount; // If new is higher, we withdraw MORE (Cash goes down)
            const unitsDiff = newUnits - oldUnits;

             // If we are increasing withdrawal, check cash availability
            if (cashDiff > 0) {
                 const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [portfolioId]);
                 if (parseFloat(cashRes.rows[0].quantity) < cashDiff) throw new Error('Insufficient cash balance to increase withdrawal.');
            }
            
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [cashDiff, portfolioId]);
        }

        // 3. Update Ledger Record
        await dbClient.query(
            'UPDATE units_ledger SET amount = $1, units = $2 WHERE id = $3',
            [newAmount, newUnits, transactionId]
        );

        // Note: We do NOT update `nav_history` total_units here for past dates because that would require
        // replaying the whole history. We update the *current* live value via recalculate.
        await recalculatePortfolioValue(dbClient, portfolioId);
        
        await dbClient.query('COMMIT');
        res.json({ success: true, message: 'Transaction updated successfully' });

    } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error('Edit Ledger Tx Error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        dbClient.release();
    }
};

const getAssetTransactions = async (req, res) => { /* ... keep existing code ... */
    const portfolioId = req.params.portfolioId;
    const userId = req.user.id;
    try {
        const { rows: portfolioRows } = await db.query('SELECT user_id FROM portfolios WHERE id = $1', [portfolioId]);
        if (portfolioRows.length === 0) return res.status(404).json({ msg: 'Portfolio not found.' });
        if (portfolioRows[0].user_id !== userId) return res.status(403).json({ msg: 'Not authorized.'});
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const transactionsResult = await db.query('SELECT * FROM asset_transactions WHERE portfolio_id = $1 ORDER BY transaction_date DESC LIMIT $2 OFFSET $3', [portfolioId, limit, offset]);
        const totalResult = await db.query('SELECT COUNT(*) FROM asset_transactions WHERE portfolio_id = $1', [portfolioId]);
        res.json({
            transactions: transactionsResult.rows,
            totalItems: parseInt(totalResult.rows[0].count),
            currentPage: page,
            totalPages: Math.ceil(totalResult.rows[0].count / limit),
        });
    } catch (err) { res.status(500).send(err.message); }
};

const getLedgerTransactions = async (req, res) => { /* ... keep existing code ... */
    const portfolioId = req.params.portfolioId;
    const userId = req.user.id;
    try {
        const { rows: portfolioRows } = await db.query('SELECT user_id FROM portfolios WHERE id = $1', [portfolioId]);
        if (portfolioRows.length === 0) return res.status(404).json({ msg: 'Portfolio not found.' });
        if (portfolioRows[0].user_id !== userId) return res.status(403).json({ msg: 'Not authorized.'});
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const transactionsResult = await db.query('SELECT * FROM units_ledger WHERE portfolio_id = $1 ORDER BY transaction_date DESC LIMIT $2 OFFSET $3', [portfolioId, limit, offset]);
        const totalResult = await db.query('SELECT COUNT(*) FROM units_ledger WHERE portfolio_id = $1', [portfolioId]);
        res.json({
            transactions: transactionsResult.rows,
            totalItems: parseInt(totalResult.rows[0].count),
            currentPage: page,
            totalPages: Math.ceil(totalResult.rows[0].count / limit),
        });
    } catch (err) { res.status(500).send(err.message); }
};

const getAssetTransactionsByTicker = async (req, res) => { /* ... keep existing code ... */
    const { portfolioId, ticker } = req.params;
    const userId = req.user.id;
    try {
        const { rows: portfolioRows } = await db.query('SELECT user_id FROM portfolios WHERE id = $1', [portfolioId]);
        if (portfolioRows.length === 0) return res.status(404).json({ msg: 'Portfolio not found.' });
        if (portfolioRows[0].user_id !== userId) return res.status(403).json({ msg: 'Not authorized.'});
        const transactionsResult = await db.query(`SELECT * FROM asset_transactions WHERE portfolio_id = $1 AND ticker = $2 ORDER BY transaction_date DESC`, [portfolioId, ticker.toUpperCase()]);
        res.json(transactionsResult.rows);
    } catch (err) { res.status(500).send(err.message); }
};

module.exports = {
  createTransaction,
  getAssetTransactions,
  getLedgerTransactions,
  getAssetTransactionsByTicker,
  updateAssetTransaction, // Exported
  updateLedgerTransaction // Exported
};