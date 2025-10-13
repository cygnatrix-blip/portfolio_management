// server/scripts/populateMfSchemes.js
const axios = require('axios');
const db = require('../config/db');

const populateMfSchemes = async () => {
  try {
    console.log('Fetching all mutual fund schemes from mfapi.in...');
    const response = await axios.get('https://api.mfapi.in/mf');
    const schemes = response.data;

    if (!schemes || schemes.length === 0) {
      console.log('No schemes found from mfapi.in');
      return;
    }

    // Start a transaction
    await db.query('BEGIN');
    console.log(`Found ${schemes.length} schemes. Populating database...`);

    // Clear the table before inserting new data to keep it fresh
    await db.query('TRUNCATE TABLE mutual_fund_schemes');

    for (const scheme of schemes) {
      const { schemeCode, schemeName } = scheme;
      const sql = `
        INSERT INTO mutual_fund_schemes (scheme_code, scheme_name)
        VALUES ($1, $2)
        ON CONFLICT (scheme_code) DO NOTHING;
      `;
      await db.query(sql, [schemeCode, schemeName]);
    }

    await db.query('COMMIT');
    console.log('Successfully populated the mutual_fund_schemes table.');

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error populating mutual fund schemes:', error.message);
  }
};

// Run the function
populateMfSchemes();