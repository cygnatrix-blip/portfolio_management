const yahooFinance = require('yahoo-finance2').default;
const db = require('../config/db');

// @desc    Search for stocks using Yahoo Finance
// @route   GET /api/assets/search-stocks
const searchStocks = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ msg: 'Query is required' });

  try {
    const results = await yahooFinance.search(query, { newsCount: 0 });

    // Ensure results.quotes exists and is an array
    const quotes = Array.isArray(results.quotes) ? results.quotes : [];

    // Filter for Indian exchanges (NSE/NSI)
    const formattedResults = quotes
      .filter(q =>
        q && q.symbol && (q.exchDisp === 'NSI' || q.exchDisp === 'NSE' || q.symbol.endsWith('.NS'))
      )
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        type: 'Stock'
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