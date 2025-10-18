// server/scripts/runEodUpdate.js
const path = require('path');
const fs = require('fs');

// CORRECT PATH: .env is in the parent directory (server folder)
const envPath = path.join(__dirname, '..', '.env');
console.log('Loading environment from:', envPath);
console.log('File exists:', fs.existsSync(envPath));

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
console.log('PGPASSWORD:', process.env.PGPASSWORD ? '***' : 'undefined');

// Now import other modules
const { updateAllEodPrices } = require('../services/eodUpdateService');

console.log('Manually starting the EOD update process...');

// Immediately invoke the function
updateAllEodPrices()
  .then(() => {
    console.log('Manual EOD script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('An error occurred during the manual EOD run:', err);
    process.exit(1);
  });