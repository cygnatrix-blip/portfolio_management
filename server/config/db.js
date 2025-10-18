const { Pool, types } = require('pg');
require('dotenv').config();

// This tells the driver to treat numeric types (like INT) as integers
types.setTypeParser(23, (val) => {
  return parseInt(val, 10);
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Export the entire pool and the original query method for any non-transactional queries
module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};

