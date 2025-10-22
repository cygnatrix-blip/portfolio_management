// 1. Load environment variables at the absolute top
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { updateAllEodPrices } = require('./services/eodUpdateService');
const { updateAllIndices } = require('./services/updateIndicesService');

// Import all active route handlers
const portfolioRoutes = require('./routes/portfolioRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const clientPortalRoutes = require('./routes/clientPortalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const assetRoutes = require('./routes/assetRoutes');

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
app.use('/api/assets', assetRoutes);

// Simple test route to confirm the server is running
app.get('/', (req, res) => res.send('API is Running!'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log('⏰ Scheduling automated tasks...');
});

// --- AUTOMATION SCHEDULING ---

// Schedule the EOD update to run at 8:00 PM IST every weekday (Mon-Fri)
console.log('📅 Scheduling daily EOD price update for 8:00 PM IST (Mon-Fri)');
cron.schedule('0 20 * * 1-5', async () => {
  console.log('--- Triggering Scheduled EOD Price Update ---');
  try {
    await updateAllEodPrices();
    console.log('✅ Scheduled EOD Price Update Complete');
  } catch (error) {
    console.error('❌ Error in scheduled EOD update:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// Schedule the indices update to run at 8:30 PM IST every weekday (Mon-Fri)
console.log('📅 Scheduling daily indices update for 8:30 PM IST (Mon-Fri)');
cron.schedule('30 20 * * 1-5', async () => {
  console.log('--- Triggering Scheduled Indices Update ---');
  try {
    const results = await updateAllIndices();
    console.log('✅ Scheduled Indices Update Complete');
    console.log('📊 Update Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('❌ Error in scheduled indices update:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// Manual trigger endpoints for testing and admin use
app.post('/api/admin/trigger-eod-update', async (req, res) => {
  try {
    console.log('--- Manual EOD Update Triggered via API ---');
    await updateAllEodPrices();
    res.json({ 
      success: true, 
      message: 'EOD update completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual EOD update failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'EOD update failed', 
      details: error.message 
    });
  }
});

app.post('/api/admin/trigger-indices-update', async (req, res) => {
  try {
    console.log('--- Manual Indices Update Triggered via API ---');
    const results = await updateAllIndices();
    res.json({ 
      success: true, 
      message: 'Indices update completed successfully',
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Manual indices update failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Indices update failed', 
      details: error.message 
    });
  }
});

// Health check endpoint that also shows last update status
app.get('/api/admin/health', async (req, res) => {
  try {
    const db = require('./config/db');
    const indicesCheck = await db.query(`
      SELECT symbol, COUNT(*) as record_count, 
             MAX(price_date) as latest_date 
      FROM index_history 
      WHERE symbol IN ('NIFTY50', 'NIFTY500')
      GROUP BY symbol
    `);
    
    const navCheck = await db.query(`
      SELECT COUNT(*) as nav_count, 
             MAX(nav_date) as latest_nav_date 
      FROM nav_history
    `);
    
    res.json({
      status: 'healthy',
      server_time: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
      indices_data: indicesCheck.rows,
      nav_data: navCheck.rows[0],
      scheduled_tasks: {
        eod_update: 'Mon-Fri 20:55 IST',
        indices_update: 'Mon-Fri 20:56 IST'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});