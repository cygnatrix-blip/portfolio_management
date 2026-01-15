const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function checkPortfolio() {
  try {
    // Get all holdings
    const holdings = await pool.query(`
      SELECT mh.ticker, mh.quantity,
             CASE WHEN mh.ticker = 'CASH' THEN mh.quantity
                  ELSE mh.quantity * COALESCE((
                    SELECT closing_price FROM daily_prices 
                    WHERE ticker = REPLACE(mh.ticker, '.NS', '')
                    ORDER BY price_date DESC LIMIT 1
                  ), 0)
             END as value
      FROM master_holdings mh
      JOIN portfolios pf ON mh.portfolio_id = pf.id
      WHERE pf.name = 'test'
      ORDER BY value DESC
    `);

    console.log('\n=== HOLDINGS ===');
    console.table(holdings.rows);

    const totalValue = holdings.rows.reduce((sum, h) => sum + parseFloat(h.value), 0);
    console.log(`\nTotal Holdings Value: ₹${totalValue.toLocaleString('en-IN', {maximumFractionDigits: 2})}`);

    // Get total investment
    const investment = await pool.query(`
      SELECT SUM(CASE 
        WHEN transaction_type = 'DEPOSIT' THEN amount
        WHEN transaction_type = 'WITHDRAWAL' THEN -amount
      END) as total_investment
      FROM units_ledger ul
      JOIN portfolios pf ON ul.portfolio_id = pf.id
      WHERE pf.name = 'test'
    `);

    const totalInvestment = parseFloat(investment.rows[0].total_investment);
    console.log(`Total Investment: ₹${totalInvestment.toLocaleString('en-IN', {maximumFractionDigits: 2})}`);
    console.log(`Difference: ₹${(totalValue - totalInvestment).toLocaleString('en-IN', {maximumFractionDigits: 2})}`);

    // Get latest NAV
    const nav = await pool.query(`
      SELECT nav_value, total_portfolio_value, total_units_outstanding
      FROM nav_history nh
      JOIN portfolios pf ON nh.portfolio_id = pf.id
      WHERE pf.name = 'test'
      ORDER BY nav_date DESC LIMIT 1
    `);

    console.log('\n=== NAV DATA ===');
    console.table(nav.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkPortfolio();
