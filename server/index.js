// 1. Load environment variables at the absolute top
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Import all route handlers
const portfolioRoutes = require('./routes/portfolioRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const clientPortalRoutes = require('./routes/clientPortalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const priceRoutes = require('./routes/priceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const marketRoutes = require('./routes/marketRoutes'); // <-- 1. IMPORT THE NEW MARKET ROUTES

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
app.use('/api/prices', priceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/market', marketRoutes); // <-- 2. USE THE NEW MARKET ROUTES

// Simple test route to confirm the server is running
app.get('/', (req, res) => res.send('API is Running!'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));



const db = require('./config/db');

// Auto-initialize Nifty data on server start
const initializeNiftyData = async () => {
  try {
    console.log('Checking and updating Nifty 50 data on server start...');
    
    // Simply try to update Nifty data on server start
    const { updateNifty50Data } = require('./controllers/priceController');
    const success = await updateNifty50Data();
    
    if (success) {
      console.log('Nifty 50 data updated successfully on server start');
    } else {
      console.log('Nifty 50 data update failed on server start, using existing data');
    }
  } catch (error) {
    console.error('Nifty data initialization failed:', error.message);
  }
};

// Call this after your database connection is established
initializeNiftyData();