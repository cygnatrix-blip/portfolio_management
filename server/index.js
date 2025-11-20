// 1. Load environment variables at the absolute top
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { updateAllEodPrices } = require('./services/eodUpdateService'); // Will need refactoring
const { updateAllIndices } = require('./services/updateIndicesService'); // Will need refactoring

// Import all active route handlers
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const assetRoutes = require('./routes/assetRoutes');
const portfolioMgmtRoutes = require('./routes/portfolioMgmtRoutes');
const marketRoutes = require('./routes/marketRoutes');
const priceRoutes = require('./routes/priceRoutes');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- NEW "SYSTEM B" API ROUTES ---
// Authentication (login/register)
app.use('/api/auth', authRoutes);
// Admin User Management (Create/Delete/Reset Investors)
app.use('/api/admin', adminRoutes);
// Investor's main portfolio list (create, delete, list)
app.use('/api/portfolios', portfolioRoutes);
// Investor Dashboards (overall and specific)
app.use('/api/dashboard', dashboardRoutes);
// Portfolio-specific management (holdings, manual NAV calc)
app.use('/api/portfolio-mgmt', portfolioMgmtRoutes);
// All transactions (Buy, Sell, Deposit, Withdraw)
app.use('/api/transactions', transactionRoutes);
// Global asset/market searching
app.use('/api/assets', assetRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/prices', priceRoutes);


// Simple test route to confirm the server is running
app.get('/', (req, res) => res.send('API is Running!'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log('⏰ Scheduling automated tasks...');
});

// --- AUTOMATION SCHEDULING (NEEDS REFACTORING FOR SYSTEM B) ---
// These cron jobs will need to be updated to loop through
// *every* portfolio from the 'portfolios' table and
// run the calculations for each one.

console.log('✅ Scheduling daily tasks...');

// 2. Schedule the EOD price update for 8:00 PM IST (20:00)
// This runs Monday to Friday
console.log('   -> EOD Price Update @ 8:00 PM IST (Mon-Fri)');
cron.schedule('17 20 * * 1-5', async () => {
  console.log('--- [CRON] Triggering Scheduled EOD Price Update ---');
  try {
    // This now calls your fixed service that updates ALL portfolios
    await updateAllEodPrices(); 
    console.log('--- [CRON] EOD Price Update Completed ---');
  } catch (err) {
    console.error('--- [CRON] EOD Price Update FAILED ---', err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// 3. Schedule the Index (Nifty) update for 8:05 PM IST (Mon-Fri)
console.log('   -> Index History Update @ 8:05 PM IST (Mon-Fri)');
cron.schedule('16 20 * * 1-5', async () => {
  console.log('--- [CRON] Triggering Scheduled Indices Update ---');
  try {
    // This service is global and is fine to run
    await updateAllIndices();
    console.log('--- [CRON] Indices Update Completed ---');
  } catch (err) {
    console.error('--- [CRON] Indices Update FAILED ---', err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});