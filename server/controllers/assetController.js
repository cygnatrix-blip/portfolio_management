const yahooFinance = require('yahoo-finance2').default;
const db = require('../config/db');

// @desc    Search for stocks using NSE data from daily_prices table
// @route   GET /api/assets/search-stocks
const searchStocks = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ msg: 'Query is required' });

  try {
    // Search by BOTH ticker symbol AND company name
    const sql = `
      SELECT 
             s.ticker,
             s.company_name,
             s.series,
             dp.last_price_date,
             dp.latest_price
      FROM nse_symbols s
      LEFT JOIN (
        SELECT ticker, 
               MAX(price_date) as last_price_date,
               (SELECT closing_price FROM daily_prices dp2 
                WHERE dp2.ticker = dp.ticker 
                ORDER BY price_date DESC LIMIT 1) as latest_price
        FROM daily_prices dp
        WHERE ticker !~ '^[0-9]+$'  -- Exclude mutual funds
        GROUP BY ticker
      ) dp ON s.ticker = dp.ticker
      WHERE (s.ticker ILIKE $1 OR s.company_name ILIKE $1)
        AND s.series IN ('EQ', 'BE')  -- Only equity series
        AND dp.last_price_date >= CURRENT_DATE - INTERVAL '30 days'  -- Only active stocks
      ORDER BY 
        LENGTH(s.ticker) ASC,  -- Shorter tickers first (usually more popular)
        s.ticker ASC
      LIMIT 20;
    `;
    
    const results = await db.query(sql, [`%${query}%`]);

    const formattedResults = results.rows.map(stock => ({
      symbol: stock.ticker + '.NS',  // Add .NS suffix for consistency
      name: stock.company_name,      // Full company name
      ticker: stock.ticker,          // Raw ticker for display
      type: 'Stock',
      series: stock.series,
      lastUpdated: stock.last_price_date,
      currentPrice: stock.latest_price ? parseFloat(stock.latest_price) : null
    }));

    res.json(formattedResults);
  } catch (err) {
    console.error('Stock search error:', err);
    res.json([]);
  }
};

// @desc    Search for mutual funds from our local DB
// @route   GET /api/assets/search-mf
const searchMutualFunds = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ msg: 'Query is required' });

  try {
    const sql = `
      SELECT scheme_code, scheme_name FROM mutual_fund_schemes
      WHERE scheme_name ILIKE $1
      LIMIT 10;
    `;
    const results = await db.query(sql, [`%${query}%`]);

    const formattedResults = results.rows.map(mf => ({
      symbol: mf.scheme_code.toString(), // Use scheme_code as the 'symbol'
      name: mf.scheme_name,
      type: 'Mutual Fund'
    }));

    res.json(formattedResults);
  } catch (err) {
    console.error('MF search error:', err.message);
    res.json([]);
  }
};

module.exports = { 
  searchStocks, 
  searchMutualFunds 
};