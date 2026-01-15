const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool();

async function testSearch() {
  try {
    console.log('\n=== Testing Company Name Search ===\n');
    
    // Search for HDFC
    const hdfc = await pool.query(`
      SELECT ticker, company_name, series 
      FROM nse_symbols 
      WHERE company_name ILIKE '%HDFC%' OR ticker ILIKE '%HDFC%' 
      LIMIT 10
    `);
    
    console.log('Search: "HDFC"');
    console.table(hdfc.rows);
    
    // Search for Reliance
    const reliance = await pool.query(`
      SELECT ticker, company_name, series 
      FROM nse_symbols 
      WHERE company_name ILIKE '%Reliance%' OR ticker ILIKE '%Reliance%' 
      LIMIT 5
    `);
    
    console.log('\nSearch: "Reliance"');
    console.table(reliance.rows);
    
    // Check HDFCAMC specifically
    const hdfcamc = await pool.query(`
      SELECT ticker, company_name, series 
      FROM nse_symbols 
      WHERE ticker = 'HDFCAMC'
    `);
    
    console.log('\nSpecific: HDFCAMC');
    console.table(hdfcamc.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

testSearch();
