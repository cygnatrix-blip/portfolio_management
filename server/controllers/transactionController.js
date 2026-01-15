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
 * FIX: Uses the latest transaction price if it's newer than the EOD price.
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
            
            // A. Get latest EOD price from DB
            const priceRes = await dbClient.query(
                'SELECT closing_price, price_date FROM daily_prices WHERE ticker = $1 ORDER BY price_date DESC LIMIT 1',
                [cleanTicker]
            );
            
            // B. Get latest transaction price for this asset in this portfolio
            const txRes = await dbClient.query(
                'SELECT price_per_share, transaction_date FROM asset_transactions WHERE portfolio_id = $1 AND ticker = $2 ORDER BY transaction_date DESC LIMIT 1',
                [portfolioId, h.ticker]
            );

            let finalPrice = 0;
            
            // Extract Data safely
            let dbPrice = priceRes.rows.length > 0 ? parseFloat(priceRes.rows[0].closing_price) : 0;
            // Convert DB date string to comparable format (YYYY-MM-DD)
            let dbDateStr = priceRes.rows.length > 0 ? new Date(priceRes.rows[0].price_date).toISOString().split('T')[0] : '1970-01-01';

            let txPrice = txRes.rows.length > 0 ? parseFloat(txRes.rows[0].price_per_share) : 0;
            let txDateStr = txRes.rows.length > 0 ? new Date(txRes.rows[0].transaction_date).toISOString().split('T')[0] : '1970-01-01';

            // C. Compare Dates (String comparison works perfectly for YYYY-MM-DD)
            // If no EOD price exists (e.g., mutual funds), use transaction price
            // If EOD price is available and newer than transaction, use EOD price
            if (dbPrice > 0 && dbDateStr >= txDateStr) {
                finalPrice = dbPrice;  // Official EOD price if available and recent
            } else if (txPrice > 0) {
                finalPrice = txPrice;  // Use purchase price for assets without EOD or if tx is newer
            } else {
                finalPrice = 0;  // Only if neither exists
            }

            totalValue += parseFloat(h.quantity) * finalPrice;
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

const createTransaction = async (req, res) => {
    const dbClient = await db.pool.connect(); 
    const userId = req.user.id; 
    const { transaction_type: type, ticker, quantity, price_per_share, total_value, portfolio_id, amount, stop_loss_price, target_price } = req.body;

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
            
            // Validate that the asset has price data (unless it's a mutual fund with numeric ticker)
            const isNumericTicker = /^[0-9]+$/.test(ticker);
            if (!isNumericTicker) {
                const cleanTicker = ticker.replace('.NS', '');
                const priceCheck = await dbClient.query(
                    'SELECT COUNT(*) as count FROM daily_prices WHERE ticker = $1 AND price_date >= CURRENT_DATE - INTERVAL \'30 days\'',
                    [cleanTicker]
                );
                if (parseInt(priceCheck.rows[0].count) === 0) {
                    throw new Error(`Stock "${ticker}" has no recent price data. Please ensure this is a valid NSE stock.`);
                }
            }
            
            const cashResult = await dbClient.query('SELECT quantity FROM master_holdings WHERE ticker = \'CASH\' AND portfolio_id = $1', [portfolioIdInt]);
            if (cashResult.rows.length === 0 || parseFloat(cashResult.rows[0].quantity) < parsedTotalValue) throw new Error('Insufficient cash.');
            // Insert with stop_loss_price and target_price
            const parsedStopLoss = stop_loss_price ? parseFloat(stop_loss_price) : null;
            const parsedTarget = target_price ? parseFloat(target_price) : null;
            const assetRes = await dbClient.query('INSERT INTO asset_transactions (transaction_type, ticker, quantity, price_per_share, total_value, portfolio_id, stop_loss_price, target_price) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *', [type, ticker.toUpperCase(), parsedQuantity, parsedPrice, parsedTotalValue, portfolioIdInt, parsedStopLoss, parsedTarget]);
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

// --- Update Asset Transaction ---
const updateAssetTransaction = async (req, res) => {
    const transactionId = req.params.id;
    const userId = req.user.id;
    const { quantity, price_per_share, stop_loss_price, target_price } = req.body;

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');
        const oldTxRes = await dbClient.query('SELECT * FROM asset_transactions WHERE id = $1', [transactionId]);
        if (oldTxRes.rows.length === 0) throw new Error('Transaction not found');
        const oldTx = oldTxRes.rows[0];
        await checkPortfolioOwner(dbClient, oldTx.portfolio_id, userId);

        const oldQty = parseFloat(oldTx.quantity);
        const oldTotalVal = parseFloat(oldTx.total_value);
        const newQty = parseFloat(quantity);
        const newPrice = parseFloat(price_per_share);
        const newTotalVal = newQty * newPrice;

        if (oldTx.transaction_type === 'BUY') {
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2 AND portfolio_id = $3', [oldQty, oldTx.ticker, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [oldTotalVal, oldTx.portfolio_id]);
        } else {
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ($1, $2, $3) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [oldTx.ticker, oldQty, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [oldTotalVal, oldTx.portfolio_id]);
        }

        if (oldTx.transaction_type === 'BUY') {
            const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [oldTx.portfolio_id]);
            if (parseFloat(cashRes.rows[0].quantity) < newTotalVal) throw new Error('Insufficient cash for this edit.');
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ($1, $2, $3) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [oldTx.ticker, newQty, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [newTotalVal, oldTx.portfolio_id]);
        } else {
            const holdRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = $1 AND portfolio_id = $2", [oldTx.ticker, oldTx.portfolio_id]);
            if (parseFloat(holdRes.rows[0].quantity) < newQty) throw new Error('Insufficient asset holdings for this edit.');
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2 AND portfolio_id = $3', [newQty, oldTx.ticker, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [newTotalVal, oldTx.portfolio_id]);
        }

        // Update with stop_loss_price and target_price
        const parsedStopLoss = stop_loss_price !== undefined ? (stop_loss_price ? parseFloat(stop_loss_price) : null) : undefined;
        const parsedTarget = target_price !== undefined ? (target_price ? parseFloat(target_price) : null) : undefined;
        
        if (parsedStopLoss !== undefined && parsedTarget !== undefined) {
            await dbClient.query('UPDATE asset_transactions SET quantity = $1, price_per_share = $2, total_value = $3, stop_loss_price = $4, target_price = $5 WHERE id = $6', [newQty, newPrice, newTotalVal, parsedStopLoss, parsedTarget, transactionId]);
        } else if (parsedStopLoss !== undefined) {
            await dbClient.query('UPDATE asset_transactions SET quantity = $1, price_per_share = $2, total_value = $3, stop_loss_price = $4 WHERE id = $5', [newQty, newPrice, newTotalVal, parsedStopLoss, transactionId]);
        } else if (parsedTarget !== undefined) {
            await dbClient.query('UPDATE asset_transactions SET quantity = $1, price_per_share = $2, total_value = $3, target_price = $4 WHERE id = $5', [newQty, newPrice, newTotalVal, parsedTarget, transactionId]);
        } else {
            await dbClient.query('UPDATE asset_transactions SET quantity = $1, price_per_share = $2, total_value = $3 WHERE id = $4', [newQty, newPrice, newTotalVal, transactionId]);
        }
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

// --- Update Ledger Transaction ---
const updateLedgerTransaction = async (req, res) => {
    const transactionId = req.params.id;
    const userId = req.user.id;
    const { amount } = req.body;

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');
        const oldTxRes = await dbClient.query('SELECT * FROM units_ledger WHERE id = $1', [transactionId]);
        if (oldTxRes.rows.length === 0) throw new Error('Transaction not found');
        const oldTx = oldTxRes.rows[0];
        await checkPortfolioOwner(dbClient, oldTx.portfolio_id, userId);

        const oldAmount = parseFloat(oldTx.amount);
        const newAmount = parseFloat(amount);
        const navRes = await dbClient.query('SELECT nav_value FROM nav_history WHERE portfolio_id = $1 AND nav_date <= $2 ORDER BY nav_date DESC LIMIT 1', [oldTx.portfolio_id, oldTx.transaction_date]);
        const historicalNAV = navRes.rows.length > 0 ? parseFloat(navRes.rows[0].nav_value) : 10.00;
        const newUnits = newAmount / historicalNAV;
        const oldUnits = parseFloat(oldTx.units);

        if (oldTx.transaction_type === 'DEPOSIT') {
            const cashDiff = newAmount - oldAmount; 
            if (cashDiff < 0) {
                 const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [oldTx.portfolio_id]);
                 if (parseFloat(cashRes.rows[0].quantity) < Math.abs(cashDiff)) throw new Error('Insufficient cash balance to reduce deposit amount.');
            }
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [cashDiff, oldTx.portfolio_id]);
        } else {
            const cashDiff = newAmount - oldAmount; 
            if (cashDiff > 0) {
                 const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [oldTx.portfolio_id]);
                 if (parseFloat(cashRes.rows[0].quantity) < cashDiff) throw new Error('Insufficient cash balance to increase withdrawal.');
            }
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [cashDiff, oldTx.portfolio_id]);
        }

        await dbClient.query('UPDATE units_ledger SET amount = $1, units = $2 WHERE id = $3', [newAmount, newUnits, transactionId]);
        await recalculatePortfolioValue(dbClient, oldTx.portfolio_id);
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

// --- NEW: DELETE Asset Transaction ---
const deleteAssetTransaction = async (req, res) => {
    const transactionId = req.params.id;
    const userId = req.user.id;

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');
        const oldTxRes = await dbClient.query('SELECT * FROM asset_transactions WHERE id = $1', [transactionId]);
        if (oldTxRes.rows.length === 0) throw new Error('Transaction not found');
        const oldTx = oldTxRes.rows[0];
        await checkPortfolioOwner(dbClient, oldTx.portfolio_id, userId);

        const qty = parseFloat(oldTx.quantity);
        const val = parseFloat(oldTx.total_value);

        if (oldTx.transaction_type === 'BUY') {
            const holdRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = $1 AND portfolio_id = $2", [oldTx.ticker, oldTx.portfolio_id]);
            if (holdRes.rows.length === 0 || parseFloat(holdRes.rows[0].quantity) < qty) {
                throw new Error('Cannot delete BUY transaction: Insufficient asset holdings (you may have sold them).');
            }
            await dbClient.query('UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = $2 AND portfolio_id = $3', [qty, oldTx.ticker, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [val, oldTx.portfolio_id]);
        } else {
            const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [oldTx.portfolio_id]);
            if (parseFloat(cashRes.rows[0].quantity) < val) {
                 throw new Error('Cannot delete SELL transaction: Insufficient cash (you may have spent the proceeds).');
            }
            await dbClient.query(`INSERT INTO master_holdings (ticker, quantity, portfolio_id) VALUES ($1, $2, $3) ON CONFLICT (portfolio_id, ticker) DO UPDATE SET quantity = master_holdings.quantity + $2`, [oldTx.ticker, qty, oldTx.portfolio_id]);
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [val, oldTx.portfolio_id]);
        }

        await dbClient.query('DELETE FROM asset_transactions WHERE id = $1', [transactionId]);
        await recalculatePortfolioValue(dbClient, oldTx.portfolio_id);
        await dbClient.query('COMMIT');
        res.json({ success: true, message: 'Transaction deleted successfully' });

    } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error('Delete Asset Tx Error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        dbClient.release();
    }
};

// --- NEW: DELETE Ledger Transaction ---
const deleteLedgerTransaction = async (req, res) => {
    const transactionId = req.params.id;
    const userId = req.user.id;

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');
        const oldTxRes = await dbClient.query('SELECT * FROM units_ledger WHERE id = $1', [transactionId]);
        if (oldTxRes.rows.length === 0) throw new Error('Transaction not found');
        const oldTx = oldTxRes.rows[0];
        await checkPortfolioOwner(dbClient, oldTx.portfolio_id, userId);

        const amount = parseFloat(oldTx.amount);

        if (oldTx.transaction_type === 'DEPOSIT') {
            const cashRes = await dbClient.query("SELECT quantity FROM master_holdings WHERE ticker = 'CASH' AND portfolio_id = $1", [oldTx.portfolio_id]);
            if (parseFloat(cashRes.rows[0].quantity) < amount) {
                throw new Error('Cannot delete DEPOSIT: Insufficient cash (you may have invested it).');
            }
            await dbClient.query("UPDATE master_holdings SET quantity = quantity - $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [amount, oldTx.portfolio_id]);
        } else {
            await dbClient.query("UPDATE master_holdings SET quantity = quantity + $1 WHERE ticker = 'CASH' AND portfolio_id = $2", [amount, oldTx.portfolio_id]);
        }

        await dbClient.query('DELETE FROM units_ledger WHERE id = $1', [transactionId]);
        await recalculatePortfolioValue(dbClient, oldTx.portfolio_id);
        await dbClient.query('COMMIT');
        res.json({ success: true, message: 'Transaction deleted successfully' });

    } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error('Delete Ledger Tx Error:', err.message);
        res.status(400).json({ success: false, message: err.message });
    } finally {
        dbClient.release();
    }
};

const getAssetTransactions = async (req, res) => {
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

const getLedgerTransactions = async (req, res) => {
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

const getAssetTransactionsByTicker = async (req, res) => {
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
  updateAssetTransaction,
  updateLedgerTransaction,
  deleteAssetTransaction,
  deleteLedgerTransaction
};