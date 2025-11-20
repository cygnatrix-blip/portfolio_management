const db = require('../config/db');

/**
 * @desc    Get all portfolios for the logged-in investor
 * @route   GET /api/portfolios
 */
const getPortfolios = async (req, res) => {
    const userId = req.user.id;
    try {
        const { rows } = await db.query(
            'SELECT * FROM portfolios WHERE user_id = $1 ORDER BY created_at DESC', 
            [userId]
        );
        res.json(rows);
    } catch (err) {
        console.error('DB Error in getPortfolios:', err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * @desc    Create a new portfolio with an initial deposit
 * @route   POST /api/portfolios
 */
const createPortfolio = async (req, res) => {
    const { name, initialAmount } = req.body;
    const userId = req.user.id;

    if (!name) {
        return res.status(400).json({ msg: 'Portfolio name is required' });
    }

    // Use client-provided initial amount, default to 1,000,000 as per original spec
    const amount = parseFloat(initialAmount) || 1000000.00;
    
    // Per requirement: initial NAV is 10, units = amount / 10
    const navValue = 10.00;
    const units = amount / navValue;

    const dbClient = await db.pool.connect();
    try {
        await dbClient.query('BEGIN');
        
        // 1. Create the portfolio
        const portfolioSql = 'INSERT INTO portfolios (user_id, name) VALUES ($1, $2) RETURNING *';
        const portfolioResult = await dbClient.query(portfolioSql, [userId, name]);
        const newPortfolio = portfolioResult.rows[0];
        const portfolioId = newPortfolio.id;

        // 2. Add initial deposit to units ledger
        const ledgerSql = 'INSERT INTO units_ledger (portfolio_id, transaction_type, amount, units) VALUES ($1, $2, $3, $4)';
        await dbClient.query(ledgerSql, [portfolioId, 'DEPOSIT', amount, units]);
        
        // 3. Add initial cash to master holdings
        const holdingsSql = 'INSERT INTO master_holdings (portfolio_id, ticker, quantity) VALUES ($1, $2, $3)';
        await dbClient.query(holdingsSql, [portfolioId, 'CASH', amount]);

        // 4. Create the first NAV record
        const navSql = 'INSERT INTO nav_history (portfolio_id, nav_date, nav_value, total_portfolio_value, total_units_outstanding) VALUES ($1, CURRENT_DATE, $2, $3, $4)';
        await dbClient.query(navSql, [portfolioId, navValue, amount, units]);
        
        await dbClient.query('COMMIT');
        res.status(201).json(newPortfolio);

    } catch (err) {
        await dbClient.query('ROLLBACK');
        console.error('DB Error in createPortfolio:', err.message);
        res.status(500).send('Server Error');
    } finally {
        dbClient.release();
    }
};

/**
 * @desc    Delete a portfolio
 * @route   DELETE /api/portfolios/:id
 */
const deletePortfolio = async (req, res) => {
    const portfolioId = req.params.id;
    const userId = req.user.id;

    try {
        // "ON DELETE CASCADE" in the database will automatically delete all
        // holdings, transactions, nav, and units for this portfolio.
        const deleteResult = await db.query(
            'DELETE FROM portfolios WHERE id = $1 AND user_id = $2 RETURNING *', 
            [portfolioId, userId]
        );
        
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ msg: 'Portfolio not found or you are not the owner.' });
        }
        
        res.json({ msg: 'Portfolio and all associated data deleted.' });
    } catch (err) {
        console.error('DB Error in deletePortfolio:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getPortfolios,
    createPortfolio,
    deletePortfolio
};