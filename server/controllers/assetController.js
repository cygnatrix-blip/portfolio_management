const yahooFinance = require('yahoo-finance2').default;
const db = require('../config/db');

// @desc    Search for stocks using Yahoo Finance
const searchStocks = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ msg: 'Query is required' });

  try {
    const results = await yahooFinance.search(query, { newsCount: 0 });

    // Ensure results.quotes exists and is an array
    const quotes = Array.isArray(results.quotes) ? results.quotes : [];

    // FIX: The filter is now more robust and correctly formatted.
    // It checks three conditions:
    // 1. The exchange is "NSI" (National Stock Exchange of India)
    // 2. The exchange is "NSE"
    // 3. The symbol ends with ".NS"
    // It also ensures the symbol exists before trying to check it.
    const formattedResults = quotes
      .filter(q =>
        q && q.symbol && (q.exchDisp === 'NSI' || q.exchDisp === 'NSE' || q.symbol.endsWith('.NS'))
      )
      .map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol, // Fallback to symbol if name is missing
        type: 'Stock'
      }));

    res.json(formattedResults);
  } catch (err) {
    console.error('Stock search error:', err);
    // On error, return an empty array to prevent breaking the frontend
    res.json([]);
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
      symbol: row.scheme_code.toString(),
      name: row.scheme_name,
      type: 'Mutual Fund'
    }));
    res.json(formattedResults);
  } catch (err) {
    console.error('Mutual fund search error:', err);
    res.json([]);
  }
};

module.exports = { searchStocks, searchMutualFunds };

