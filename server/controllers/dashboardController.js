const db = require('../config/db');

// @desc    Get all data for the admin dashboard
// @route   GET /api/dashboard
const getDashboardData = async (req, res) => {
  try {
    console.log('📊 Fetching dashboard data...');
    
    const navResult = await db.query(
      'SELECT * FROM nav_history ORDER BY nav_date DESC LIMIT 1'
    );
    const latestNav = navResult.rows.length > 0 ? navResult.rows[0] : null;

    const navHistoryResult = await db.query(
      'SELECT nav_date, nav_value FROM nav_history ORDER BY nav_date ASC'
    );
    const navHistory = navHistoryResult.rows;

    // NIFTY 50 Query
    const niftyHistoryResult = await db.query(
      `SELECT price_date AS "date", closing_price AS "price" 
       FROM index_history 
       WHERE symbol = 'NIFTY50' 
       ORDER BY price_date ASC`
    );
    const niftyHistory = niftyHistoryResult.rows;

    // NIFTY 500 Query
    const nifty500HistoryResult = await db.query(
      `SELECT price_date AS "date", closing_price AS "price" 
       FROM index_history 
       WHERE symbol = 'NIFTY500' 
       ORDER BY price_date ASC`
    );
    const nifty500History = nifty500HistoryResult.rows;

    // Enhanced debugging
    console.log('=== DASHBOARD DATA DEBUG ===');
    console.log(`📈 NIFTY 50 records: ${niftyHistory.length}`);
    console.log(`📈 NIFTY 500 records: ${nifty500History.length}`);
    console.log(`💰 NAV records: ${navHistory.length}`);
    
    if (nifty500History.length === 0) {
      console.warn('⚠️  NIFTY 500 data is empty! Run: node updateIndices.js');
    }
    
    if (latestNav) {
      console.log(`📅 Latest NAV date: ${latestNav.nav_date}`);
    }
    
    console.log('===========================');

    let totalInvestment = 0;
    let absoluteCapitalGain = 0;
    let absoluteCapitalPercentage = 0;

    const ledgerSummaryResult = await db.query(
      `SELECT 
         SUM(CASE WHEN transaction_type = 'DEPOSIT' THEN amount ELSE 0 END) AS total_deposits,
         SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN amount ELSE 0 END) AS total_withdrawals
       FROM units_ledger`
    );

    if (ledgerSummaryResult.rows.length > 0) {
      const { total_deposits, total_withdrawals } = ledgerSummaryResult.rows[0];
      totalInvestment =
        parseFloat(total_deposits || 0) - parseFloat(total_withdrawals || 0);
    }

    if (latestNav) {
      absoluteCapitalGain =
        parseFloat(latestNav.total_portfolio_value) - totalInvestment;
    }

    if (totalInvestment > 0) {
      absoluteCapitalPercentage = (absoluteCapitalGain / totalInvestment) * 100;
    }

    // Holdings calculation
    const holdingsResult = await db.query(
      'SELECT * FROM master_holdings WHERE quantity > 0'
    );
    const holdings = holdingsResult.rows;
    let holdingsWithValue = [];

    if (latestNav && holdings.length > 0) {
      const totalPortfolioValue = parseFloat(latestNav.total_portfolio_value);

      for (const holding of holdings) {
        let value = 0;
        if (holding.ticker === 'CASH') {
          value = parseFloat(holding.quantity);
        } else {
          const priceResult = await db.query(
            'SELECT closing_price FROM daily_prices WHERE ticker = $1 AND price_date <= $2 ORDER BY price_date DESC LIMIT 1',
            [holding.ticker, latestNav.nav_date]
          );
          if (priceResult.rows.length > 0) {
            value =
              parseFloat(holding.quantity) *
              parseFloat(priceResult.rows[0].closing_price);
          }
        }
        holdingsWithValue.push({
          name: holding.ticker,
          value: parseFloat(value.toFixed(2)),
        });
      }

      holdingsWithValue = holdingsWithValue.map((holding) => ({
        ...holding,
        percentage:
          totalPortfolioValue > 0
            ? (holding.value / totalPortfolioValue) * 100
            : 0,
      }));
    }

    // Client calculations
    const clientsResult = await db.query('SELECT * FROM clients ORDER BY name');
    const clients = clientsResult.rows;
    const ledgerResult = await db.query('SELECT * FROM units_ledger');
    const ledgerEntries = ledgerResult.rows;
    const clientUnitHoldings = {};
    
    for (const entry of ledgerEntries) {
      const clientId = entry.client_id;
      const units = parseFloat(entry.units);
      if (!clientUnitHoldings[clientId]) clientUnitHoldings[clientId] = 0;
      if (entry.transaction_type === 'DEPOSIT')
        clientUnitHoldings[clientId] += units;
      else if (entry.transaction_type === 'WITHDRAWAL')
        clientUnitHoldings[clientId] -= units;
    }
    
    const clientsWithDetails = clients.map((client) => {
      const totalUnits = clientUnitHoldings[client.id] || 0;
      const currentValue = latestNav
        ? totalUnits * parseFloat(latestNav.nav_value)
        : 0;
      return { ...client, totalUnits, currentValue };
    });

    const assetTransactionsResult = await db.query(
      'SELECT * FROM asset_transactions ORDER BY transaction_date DESC LIMIT 25'
    );

    // Response with both NIFTY 50 and NIFTY 500 data
    const response = {
      latestNav,
      clients: clientsWithDetails,
      holdings: holdingsWithValue,
      navHistory: navHistory,
      assetTransactions: assetTransactionsResult.rows,
      niftyHistory: niftyHistory,
      nifty500History: nifty500History,
      totalInvestment: totalInvestment,
      absoluteCapitalGain: absoluteCapitalGain,
      absoluteCapitalPercentage: absoluteCapitalPercentage,
      metadata: {
        nifty50Records: niftyHistory.length,
        nifty500Records: nifty500History.length,
        navRecords: navHistory.length,
        lastUpdated: new Date().toISOString()
      }
    };

    console.log('✅ Dashboard data fetched successfully');
    res.json(response);
    
  } catch (err) {
    console.error('❌ DB Error in getDashboardData:', err.message);
    res.status(500).json({ 
      error: 'Server Error',
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  getDashboardData,
};