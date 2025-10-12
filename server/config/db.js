const { Pool, types } = require('pg'); // 1. Import 'types'
require('dotenv').config();

// 2. Add this parser to ensure numbers are read correctly
// This tells the driver to treat numeric types (like INT) as integers
types.setTypeParser(23, (val) => {
  return parseInt(val, 10);
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};