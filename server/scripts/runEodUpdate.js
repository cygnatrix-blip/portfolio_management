// server/scripts/runEodUpdate.js
const path = require('path');
const fs = require('fs');

// CORRECT PATH: .env is in the parent directory (server folder)
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading environment from:', envPath);

// Load environment variables FIRST before any other imports
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('✅ Environment variables loaded successfully');
} else {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

// Debug: Check if variables are loaded
console.log('Environment check in runEodUpdate:');
console.log('PGUSER:', process.env.PGUSER || 'undefined');
console.log('PGDATABASE:', process.env.PGDATABASE || 'undefined');

// --- IMPORT BOTH SERVICES ---
const { updateAllEodPrices } = require('../services/eodUpdateService');
const { updateAllIndices } = require('../services/updateIndicesService'); // <-- NEW IMPORT

console.log('🚀 Manually starting the EOD update process...');

const runUpdate = async () => {
  try {
    // 1. Update Stocks and Mutual Funds (and recalculate NAVs)
    console.log('\n--- STEP 1: Updating Stocks & MFs ---');
    await updateAllEodPrices();

    // 2. Update Market Indices (Nifty 50 / 500)
    console.log('\n--- STEP 2: Updating Market Indices ---');
    await updateAllIndices(); // <-- NEW CALL

    console.log('\n✅ Manual EOD script finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ An error occurred during the manual EOD run:', err);
    process.exit(1);
  }
};

// Execute the function
runUpdate();