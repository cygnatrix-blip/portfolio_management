const db = require('../config/db');

// Import the Nifty functions from your market controller
const { fetchFromYahooFinance, storeNiftyDataInDB } = require('./marketController');

// @desc    Update daily closing prices and recalculate EOD NAV
// @route   POST /api/prices
const updateDailyPrices = async (req, res) => {
  const { prices } = req.body;
  if (!prices || !Array.isArray(prices)) {
    return res.status(400).json({ msg: 'Invalid price data format.' });
  }

  const client = await db.query('BEGIN');

  try {
    // Step 1: Save all the new daily prices
    for (const asset of prices) {
      if (asset.ticker && asset.price) {
        const sql = `
          INSERT INTO daily_prices (ticker, price_date, closing_price)
          VALUES ($1, CURRENT_DATE, $2)
          ON CONFLICT (ticker, price_date) DO UPDATE SET closing_price = $2;
        `;
        await db.query(sql, [asset.ticker.toUpperCase(), asset.price]);
      }
    }

    // Step 2: Fetch all holdings
    const holdingsResult = await db.query('SELECT ticker, quantity FROM master_holdings WHERE quantity > 0');
    const holdings = holdingsResult.rows;

    // Step 3: Calculate new total portfolio value based on the prices just submitted
    let newTotalPortfolioValue = 0;
    for (const holding of holdings) {
      let value = 0;
      if (holding.ticker === 'CASH') {
        value = parseFloat(holding.quantity);
      } else {
        const priceResult = await db.query(
          'SELECT closing_price FROM daily_prices WHERE ticker = $1 ORDER BY price_date DESC LIMIT 1',
          [holding.ticker]
        );
        if (priceResult.rows.length > 0) {
          const latestPrice = parseFloat(priceResult.rows[0].closing_price);
          value = parseFloat(holding.quantity) * latestPrice;
        }
      }
      newTotalPortfolioValue += value;
    }

    // Step 4: Get latest units and calculate new NAV
    const lastNavResult = await db.query('SELECT total_units_outstanding FROM nav_history ORDER BY nav_date DESC LIMIT 1');
    const totalUnitsOutstanding = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].total_units_outstanding) : 0;
    const newNavValue = totalUnitsOutstanding > 0 ? newTotalPortfolioValue / totalUnitsOutstanding : 0;

    // Step 5: Update NAV history
    const navSql = `
      INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
      VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (nav_date) DO UPDATE SET
        nav_value = EXCLUDED.nav_value,
        total_portfolio_value = EXCLUDED.total_portfolio_value;
    `;
    await db.query(navSql, [newNavValue, newTotalPortfolioValue, totalUnitsOutstanding]);
    
    await db.query('COMMIT');

    // Step 6: Update Nifty 50 data using Yahoo Finance (outside transaction since it's not critical)
    console.log('Updating Nifty 50 data with Yahoo Finance...');
    const niftyUpdated = await updateNifty50Data();
    
    res.status(200).json({ 
      msg: 'Prices and NAV updated successfully.',
      niftyUpdated: niftyUpdated
    });

  } catch (err) {
    await db.query('ROLLBACK');
    console.error('DB Error in updateDailyPrices:', err.message);
    res.status(500).send('Server Error');
  }
};

// Nifty 50 update function that uses your existing Yahoo Finance setup
const updateNifty50Data = async () => {
  try {
    console.log('Fetching latest Nifty 50 data from Yahoo Finance...');
    
    // Use your existing Yahoo Finance function
    const niftyData = await fetchFromYahooFinance();
    
    if (niftyData && niftyData.length > 0) {
      // Use your existing store function
      await storeNiftyDataInDB(niftyData);
      console.log(`Successfully updated ${niftyData.length} Nifty 50 records`);
      return true;
    } else {
      console.log('No Nifty data received from Yahoo Finance');
      return false;
    }
    
  } catch (error) {
    console.error('Error updating Nifty 50 data:', error.message);
    return false;
  }
};

module.exports = {
  updateDailyPrices,
  updateNifty50Data
};