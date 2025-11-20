const db = require('../config/db');

// @desc    Get market data for Nifty 50 and Nifty 500
// @route   GET /api/market/indices
const getMarketIndices = async (req, res) => {
  try {
    // NIFTY 50 Query
    const niftyHistoryResult = await db.query(
      `SELECT price_date AS "date", closing_price AS "price" 
       FROM index_history 
       WHERE symbol = 'NIFTY50' 
       ORDER BY price_date ASC`
    );
    const niftyHistory = niftyHistoryResult.rows;

    // NIFTY 500 Query
    const nifty500HistoryResult = await db.query(
      `SELECT price_date AS "date", closing_price AS "price" 
       FROM index_history 
       WHERE symbol = 'NIFTY500' 
       ORDER BY price_date ASC`
    );
    const nifty500History = nifty500HistoryResult.rows;
    
    res.json({
      nifty50: niftyHistory,
      nifty500: nifty500History,
    });

  } catch (err) {
    console.error('Error fetching market indices:', err);
    res.status(500).json({ msg: 'Failed to fetch market data' });
  }
};

module.exports = {
  getMarketIndices,
};