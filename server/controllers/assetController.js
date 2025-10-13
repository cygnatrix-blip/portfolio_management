// server/controllers/assetController.js
const yahooFinance = require('yahoo-finance2').default;
const db = require('../config/db');

// @desc    Search for stocks using Yahoo Finance
const searchStocks = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ msg: 'Query is required' });

  try {
    const results = await yahooFinance.search(query, { newsCount: 0 });
    const formattedResults = results.quotes
      .filter(q => q.exchDisp === 'NSI') // Filter for NSE stocks
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname,
        type: 'Stock'
      }));
    res.json(formattedResults);
  } catch (err) {
    console.error('Stock search error:', err);
    res.status(500).send('Server Error');
  }
};

// @desc    Search for mutual funds from our local DB
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

    const formattedResults = results.rows.map(row => ({
      symbol: row.scheme_code.toString(), // Use scheme_code as the "symbol"
      name: row.scheme_name,
      type: 'Mutual Fund'
    }));
    res.json(formattedResults);
  } catch (err) {
    console.error('Mutual fund search error:', err);
    res.status(500).send('Server Error');
  }
};

module.exports = { searchStocks, searchMutualFunds };