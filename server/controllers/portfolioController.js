const db = require('../config/db');

// @desc    Get all master holdings
// @route   GET /api/portfolio/holdings
const getHoldings = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM master_holdings ORDER BY ticker');
    res.json(rows);
  } catch (err) {
    console.error('DB ERROR in getHoldings:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Add or update a holding
// @route   POST /api/portfolio/holdings
const addOrUpdateHolding = async (req, res) => {
  const { ticker, quantity } = req.body;
  if (!ticker || quantity === undefined) {
    return res.status(400).json({ msg: 'Please include a ticker and quantity' });
  }
  try {
    const sql = `
      INSERT INTO master_holdings (ticker, quantity)
      VALUES ($1, $2)
      ON CONFLICT (ticker)
      DO UPDATE SET quantity = master_holdings.quantity + $2
      RETURNING *;
    `;
    const { rows } = await db.query(sql, [ticker.toUpperCase(), parseFloat(quantity)]);
    res.json(rows[0]);
  } catch (err) {
    console.error('DB ERROR in addOrUpdateHolding:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Manually update NAV for the day
// @route   POST /api/portfolio/nav
const updateNavManually = async (req, res) => {
  const { total_portfolio_value } = req.body;

  if (!total_portfolio_value) {
    return res.status(400).json({ msg: 'Please include the total portfolio value' });
  }

  try {
    const lastNavResult = await db.query(
      'SELECT total_units_outstanding FROM nav_history ORDER BY nav_date DESC LIMIT 1'
    );

    if (lastNavResult.rows.length === 0) {
      return res.status(404).json({ msg: 'No NAV history found. A client must deposit first.' });
    }
    const totalUnitsOutstanding = parseFloat(lastNavResult.rows[0].total_units_outstanding);

    if (totalUnitsOutstanding <= 0) {
        return res.status(400).json({ msg: 'Total units are zero. Cannot calculate NAV.'});
    }

    const newNavValue = parseFloat(total_portfolio_value) / totalUnitsOutstanding;

    // --- THIS SQL IS NOW CORRECTED ---
    // It correctly updates the value and NAV, but LEAVES THE UNITS UNCHANGED.
    const navSql = `
      INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
      VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (nav_date) DO UPDATE SET
        nav_value = EXCLUDED.nav_value,
        total_portfolio_value = EXCLUDED.total_portfolio_value
      RETURNING *;
    `;
    
    const { rows } = await db.query(navSql, [newNavValue, total_portfolio_value, totalUnitsOutstanding]);
    res.json(rows[0]);

  } catch (err) {
    console.error('DB ERROR in updateNavManually:', err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  getHoldings,
  addOrUpdateHolding,
  updateNavManually,
};

