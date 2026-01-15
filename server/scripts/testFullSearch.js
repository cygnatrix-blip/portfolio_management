const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function testFullSearch() {
  try {
    console.log('\n=== Testing Full Search API (with price data) ===\n');
    
    // Simulate the actual API query
    const query = 'HDFC';
    const sql = `
      SELECT DISTINCT 
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
        WHERE ticker !~ '^[0-9]+$'
        GROUP BY ticker
      ) dp ON s.ticker = dp.ticker
      WHERE (s.ticker ILIKE $1 OR s.company_name ILIKE $1)
        AND s.series IN ('EQ', 'BE')
        AND dp.last_price_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY 
        CASE 
          WHEN s.ticker ILIKE $1 THEN 1
          ELSE 2
        END,
        s.ticker
      LIMIT 10;
    `;
    
    const result = await pool.query(sql, [`%${query}%`]);
    
    console.log(`Search: "${query}"`);
    console.log(`Found: ${result.rows.length} results\n`);
    console.table(result.rows);
    
    // Check if HDFCAMC-BL would appear
    const invalidCheck = await pool.query(`
      SELECT ticker, company_name 
      FROM nse_symbols 
      WHERE ticker = 'HDFCAMC-BL'
    `);
    
    console.log(`\n=== Invalid Ticker Check ===`);
    console.log(`HDFCAMC-BL in nse_symbols: ${invalidCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

testFullSearch();
