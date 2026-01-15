// Script to apply stop loss database migration
const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  const client = await pool.connect();
  try {
    console.log('🔄 Applying stop loss migration...');
    
    const sqlPath = path.join(__dirname, 'addStopLossPriceColumn.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    
    console.log('✅ Migration applied successfully!');
    console.log('✅ Added stop_loss_price column to asset_transactions table');
    console.log('✅ Created index for better query performance');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Create a BUY transaction with a stop loss price');
    console.log('   3. Check the holdings table for the stop loss display');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to apply migration:', error);
    process.exit(1);
  });
