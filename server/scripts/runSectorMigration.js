// server/scripts/runSectorMigration.js
// Run this script to add sector column to nse_symbols table

const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
  try {
    console.log('📊 Running Sector Column Migration...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'addSectorToNseSymbols.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute migration
    await db.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added sector column to nse_symbols table');
    console.log('   - Added industry column to nse_symbols table');
    console.log('   - Created index on sector column');
    console.log('\n📥 Next step: Run EOD update to populate sector data');
    console.log('   Command: node scripts/runEodUpdate.js\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
