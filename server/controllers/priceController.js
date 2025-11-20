const db = require('../config/db');

// @desc    Add a new daily price
// @route   POST /api/prices
const addDailyPrice = async (req, res) => {
  const { ticker, price_date, closing_price } = req.body;

  if (!ticker || !price_date || !closing_price) {
    return res.status(400).json({ msg: 'Ticker, date, and price are required.' });
  }

  try {
    const sql = `
      INSERT INTO daily_prices (ticker, price_date, closing_price)
      VALUES ($1, $2, $3)
      ON CONFLICT (ticker, price_date) DO UPDATE SET
        closing_price = EXCLUDED.closing_price
      RETURNING *;
    `;
    const { rows } = await db.query(sql, [ticker.toUpperCase(), price_date, closing_price]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('DB Error in addDailyPrice:', err.message);
    res.status(500).send('Server Error');
  }
};

// @desc    Get all daily prices for a ticker
// @route   GET /api/prices/:ticker
const getPricesForTicker = async (req, res) => {
  const { ticker } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM daily_prices WHERE ticker = $1 ORDER BY price_date ASC',
      [ticker.toUpperCase()]
    );
    res.json(rows);
  } catch (err) {
    console.error('DB Error in getPricesForTicker:', err.message);
    res.status(500).send('Server Error');
  }
};

module.exports = {
  addDailyPrice,
  getPricesForTicker,
};