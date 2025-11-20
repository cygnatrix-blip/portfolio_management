const db = require('../config/db');

/**
 * @desc    Helper to check if user owns the portfolio
 */
const checkPortfolioOwner = async (portfolioId, userId) => {
    // This helper can be used by any function in this controller
    const { rows } = await db.query('SELECT user_id FROM portfolios WHERE id = $1', [portfolioId]);
    if (rows.length === 0) throw new Error('Portfolio not found.');
    if (rows[0].user_id !== userId) throw new Error('You are not authorized to manage this portfolio.');
    return true;
};

/**
 * @desc    Get all master holdings for a specific portfolio
 * @route   GET /api/portfolio-mgmt/:id/holdings
 */
const getHoldings = async (req, res) => {
  const portfolioId = req.params.id;
  const userId = req.user.id;

  try {
    // Check ownership
    await checkPortfolioOwner(portfolioId, userId);

    const { rows } = await db.query(
      'SELECT * FROM master_holdings WHERE portfolio_id = $1 ORDER BY ticker',
      [portfolioId] // <-- Filter by portfolio
    );
    res.json(rows);
  } catch (err) {
    console.error('DB ERROR in getHoldings:', err.message);
    res.status(err.message.startsWith('Portfolio') ? 404 : 500).json({ msg: err.message });
  }
};

/**
 * @desc    DEPRECATED - Add or update a holding
 * @route   POST /api/portfolio-mgmt/:id/holdings
 */
const addOrUpdateHolding = async (req, res) => {
    res.status(405).json({ msg: 'This route is deprecated. Please use POST /api/transactions to manage holdings.' });
};

/**
 * @desc    Manually calculate and update NAV for the day for a specific portfolio
 * @route   POST /api/portfolio-mgmt/:id/nav
 */
const updateManualNav = async (req, res) => {
  const { total_portfolio_value } = req.body;
  const portfolioId = req.params.id;
  const userId = req.user.id;

  if (!total_portfolio_value) {
    return res.status(400).json({ msg: 'Please include the total portfolio value' });
  }

  try {
    // Check ownership
    await checkPortfolioOwner(portfolioId, userId);

    // Get total units for THIS portfolio
    // This uses the units_ledger for the most accurate "current" unit count
    const unitsResult = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN units ELSE -units END), 0) as "totalUnits"
       FROM units_ledger
       WHERE portfolio_id = $1`,
      [portfolioId]
    );

    const totalUnitsOutstanding = parseFloat(unitsResult.rows[0].totalUnits);

    if (totalUnitsOutstanding <= 0) {
        return res.status(400).json({ msg: 'Total units are zero or negative. Cannot calculate NAV.'});
    }

    const newNavValue = parseFloat(total_portfolio_value) / totalUnitsOutstanding;

    // Insert NAV record for THIS portfolio
    const navSql = `
      INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding, portfolio_id)
      VALUES (CURRENT_DATE, $1, $2, $3, $4)
      ON CONFLICT (portfolio_id, nav_date) -- <-- Use new composite key
      DO UPDATE SET
        nav_value = EXCLUDED.nav_value,
        total_portfolio_value = EXCLUDED.total_portfolio_value,
        total_units_outstanding = EXCLUDED.total_units_outstanding
      RETURNING *;
    `;
    
    const { rows } = await db.query(navSql, [newNavValue, total_portfolio_value, totalUnitsOutstanding, portfolioId]);
    res.json(rows[0]);

  } catch (err) {
    console.error('DB Error in updateManualNav:', err.message);
    res.status(err.message.startsWith('Portfolio') ? 404 : 500).json({ msg: err.message });
  }
};

module.exports = {
  getHoldings,
  addOrUpdateHolding,
  updateManualNav,
};