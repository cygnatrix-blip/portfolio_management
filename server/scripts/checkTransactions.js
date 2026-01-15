const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function checkTransactions() {
  try {
    const result = await pool.query(`
      SELECT ticker, transaction_type, quantity, price_per_share, 
             transaction_date, total_value
      FROM asset_transactions at
      JOIN portfolios pf ON at.portfolio_id = pf.id
      WHERE pf.name = 'test'
        AND ticker LIKE 'HDFCAMC%'
      ORDER BY transaction_date DESC
    `);

    console.log('\n=== HDFCAMC TRANSACTIONS ===');
    console.table(result.rows);

    const avgPrice = await pool.query(`
      SELECT ticker,
             SUM(quantity * price_per_share) / NULLIF(SUM(quantity), 0) as avg_price,
             SUM(quantity) as total_bought
      FROM asset_transactions at
      JOIN portfolios pf ON at.portfolio_id = pf.id
      WHERE pf.name = 'test'
        AND ticker LIKE 'HDFCAMC%'
        AND transaction_type = 'BUY'
      GROUP BY ticker
    `);

    console.log('\n=== AVERAGE PURCHASE PRICE ===');
    console.table(avgPrice.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkTransactions();
