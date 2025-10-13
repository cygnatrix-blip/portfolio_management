// 1. Load environment variables at the absolute top
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { updateAllEodPrices } = require('./services/eodUpdateService');

// Import all active route handlers
const portfolioRoutes = require('./routes/portfolioRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const clientPortalRoutes = require('./routes/clientPortalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const assetRoutes = require('./routes/assetRoutes'); // <-- New route for asset searching

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Define All API Routes
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portal', clientPortalRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assets', assetRoutes); // <-- Use the new asset search routes

// --- REMOVED old /api/prices and /api/market routes as they are no longer needed ---

// Simple test route to confirm the server is running
app.get('/', (req, res) => res.send('API is Running!'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// --- AUTOMATION ---
// Schedule the EOD update to run at 8:00 PM IST every weekday (Mon-Fri)
// This gives NSE enough time to publish the daily Bhavcopy.
console.log('Scheduling daily EOD price update for 8:00 PM IST (Mon-Fri).');
cron.schedule('0 20 * * 1-5', () => {
  console.log('--- Triggering Scheduled EOD Price Update ---');
  updateAllEodPrices();
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// --- REMOVED old initializeNiftyData function ---
// This is now handled entirely and more robustly by the eodUpdateService.
