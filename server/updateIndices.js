// updateIndices.js - Standalone script for manual execution
require('dotenv').config();

const { updateAllIndices } = require('./services/updateIndicesService');
const db = require('./config/db');

/**
 * Standalone script that runs the indices update and then closes the database pool
 */
const runAsStandalone = async () => {
  console.log('🚀 Starting manual indices update...');
  console.log('⏰', new Date().toString());
  
  try {
    const results = await updateAllIndices();
    
    console.log('\n🎉 Manual indices update completed successfully!');
    console.log('📊 Final Results:');
    console.log(JSON.stringify(results, null, 2));
    
    // Check if we have data in the database
    const checkQuery = await db.query(`
      SELECT symbol, COUNT(*) as total_records, 
             MIN(price_date) as earliest, 
             MAX(price_date) as latest 
      FROM index_history 
      WHERE symbol IN ('NIFTY50', 'NIFTY500')
      GROUP BY symbol
    `);
    
    console.log('\n📋 Database Status:');
    checkQuery.rows.forEach(row => {
      console.log(`   ${row.symbol}: ${row.total_records} records (${row.earliest} to ${row.latest})`);
    });
    
  } catch (error) {
    console.error('❌ Manual indices update failed:', error);
    process.exit(1);
  } finally {
    // Close the database pool since this is a standalone script
    await db.pool.end();
    console.log('🔒 Database pool closed.');
    process.exit(0);
  }
};

// Add graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n⚠️  Received SIGINT. Shutting down gracefully...');
  await db.pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Received SIGTERM. Shutting down gracefully...');
  await db.pool.end();
  process.exit(0);
});

// Run if this file is executed directly
if (require.main === module) {
  runAsStandalone();
}

module.exports = { runAsStandalone };