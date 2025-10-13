// server/services/eodUpdateService.js
const axios = require('axios');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const db = require('../config/db');
const { format } = require('date-fns');

const updateAllEodPrices = async () => {
  console.log('--- Starting Daily EOD Price Update ---');
  try {
    await db.query('BEGIN');

    // 1. Update stock prices from NSE Bhavcopy
    await updateStockPricesFromBhavcopy();

    // 2. Update mutual fund NAVs from mfapi.in
    await updateMutualFundNavs();

    // 3. Recalculate NAV
    await recalculateNav();

    await db.query('COMMIT');
    console.log('--- EOD Price Update Completed Successfully ---');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('EOD update process failed:', error.message);
  }
};

const updateStockPricesFromBhavcopy = async () => {
  console.log('Fetching and processing NSE Bhavcopy...');
  const today = new Date();
  const dateStr = format(today, 'ddMMyyyy');
  const monthStr = format(today, 'MMM').toUpperCase();
  const yearStr = format(today, 'yyyy');

  const bhavcopyUrl = `https://archives.nseindia.com/content/historical/EQUITIES/${yearStr}/${monthStr}/cm${dateStr}bhav.csv.zip`;

  try {
    const response = await axios.get(bhavcopyUrl, { responseType: 'arraybuffer' });
    const zip = new AdmZip(response.data);
    const zipEntries = zip.getEntries();
    const csvEntry = zipEntries.find(entry => entry.entryName.endsWith('.csv'));

    if (!csvEntry) {
      throw new Error('Bhavcopy CSV not found in the ZIP archive.');
    }

    const csvData = zip.readAsText(csvEntry);
    
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = csv()
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log(`Parsed ${results.length} records from Bhavcopy.`);
          for (const row of results) {
            // We only care about the Equity series
            if (row.SERIES === 'EQ') {
              const ticker = row.SYMBOL.trim();
              const closingPrice = parseFloat(row.CLOSE);
              const priceDate = new Date(row.TIMESTAMP);

              const sql = `
                INSERT INTO daily_prices (ticker, price_date, closing_price)
                VALUES ($1, $2, $3)
                ON CONFLICT (ticker, price_date) DO UPDATE SET closing_price = $3;
              `;
              await db.query(sql, [ticker, priceDate, closingPrice]);
            }
          }
          console.log('Stock prices updated from Bhavcopy.');
          resolve();
        })
        .on('error', (error) => reject(error));
        
      stream.write(csvData);
      stream.end();
    });

  } catch (error) {
    console.error(`Failed to fetch or process Bhavcopy from ${bhavcopyUrl}. It might not be available yet.`, error.message);
  }
};

const updateMutualFundNavs = async () => {
  console.log('Updating Mutual Fund NAVs...');
  const mfHoldingsResult = await db.query(`
    SELECT DISTINCT ticker FROM master_holdings 
    WHERE ticker ~ '^[0-9]+$'`); // A simple regex to identify numeric scheme codes
  
  const mfTickers = mfHoldingsResult.rows.map(row => row.ticker);

  if (mfTickers.length === 0) {
    console.log('No mutual fund holdings to update.');
    return;
  }

  for (const schemeCode of mfTickers) {
    try {
      const response = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`);
      const latestNavData = response.data.data[0];
      const nav = parseFloat(latestNavData.nav);
      // mfapi.in date format is "dd-mm-yyyy"
      const [day, month, year] = latestNavData.date.split('-');
      const navDate = new Date(`${year}-${month}-${day}`);

      const sql = `
        INSERT INTO daily_prices (ticker, price_date, closing_price)
        VALUES ($1, $2, $3)
        ON CONFLICT (ticker, price_date) DO UPDATE SET closing_price = $3;
      `;
      await db.query(sql, [schemeCode, navDate, nav]);

    } catch (error) {
      console.error(`Failed to update NAV for scheme ${schemeCode}:`, error.message);
    }
  }
  console.log('Mutual Fund NAVs updated.');
};

const recalculateNav = async () => {
  console.log('Recalculating portfolio NAV...');
  // This logic is copied from your existing priceController
  const holdingsResult = await db.query('SELECT ticker, quantity FROM master_holdings WHERE quantity > 0');
  const holdings = holdingsResult.rows;

  let newTotalPortfolioValue = 0;
  for (const holding of holdings) {
    let value = 0;
    if (holding.ticker === 'CASH') {
      value = parseFloat(holding.quantity);
    } else {
      const priceResult = await db.query('SELECT closing_price FROM daily_prices WHERE ticker = $1 ORDER BY price_date DESC LIMIT 1', [holding.ticker]);
      if (priceResult.rows.length > 0) {
        const latestPrice = parseFloat(priceResult.rows[0].closing_price);
        value = parseFloat(holding.quantity) * latestPrice;
      }
    }
    newTotalPortfolioValue += value;
  }

  const lastNavResult = await db.query('SELECT total_units_outstanding FROM nav_history ORDER BY nav_date DESC LIMIT 1');
  const totalUnitsOutstanding = lastNavResult.rows.length > 0 ? parseFloat(lastNavResult.rows[0].total_units_outstanding) : 0;
  const newNavValue = totalUnitsOutstanding > 0 ? newTotalPortfolioValue / totalUnitsOutstanding : 0;

  const navSql = `
    INSERT INTO nav_history (nav_date, nav_value, total_portfolio_value, total_units_outstanding)
    VALUES (CURRENT_DATE, $1, $2, $3)
    ON CONFLICT (nav_date) DO UPDATE SET
      nav_value = EXCLUDED.nav_value,
      total_portfolio_value = EXCLUDED.total_portfolio_value;
  `;
  await db.query(navSql, [newNavValue, newTotalPortfolioValue, totalUnitsOutstanding]);
  console.log('Portfolio NAV recalculated and updated.');
};

module.exports = { updateAllEodPrices };