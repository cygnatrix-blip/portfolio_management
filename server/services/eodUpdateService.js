const axios = require('axios');
const AdmZip = require('adm-zip');
const csv = require('csv-parser');
const db = require('../config/db');
const { format, subDays } = require('date-fns');

const updateAllEodPrices = async (targetDate) => {
  console.log('--- Starting Daily EOD Price Update ---');
  try {
    // First test database connection
    await testDatabaseInsert();
    
    const dateForUpdate = targetDate ? new Date(targetDate) : getLatestWeekday();
    console.log(`Running EOD update for date: ${format(dateForUpdate, 'yyyy-MM-dd')}`);

    await updateStockPricesFromBhavcopy(dateForUpdate);
    await updateMutualFundNavs(dateForUpdate);
    await recalculateNav(dateForUpdate);
    
    console.log('--- EOD Price Update Completed Successfully ---');
    return true;
  } catch (error) {
    console.error('--- EOD Price Update FAILED ---');
    console.error('An error occurred during the update process:', error.message);
    return false;
  }
};

const testDatabaseInsert = async () => {
  console.log('🧪 Testing database connection with manual insert...');
  try {
    const testDate = new Date().toISOString().split('T')[0];
    const result = await db.query(
      'INSERT INTO daily_prices (ticker, price_date, closing_price) VALUES ($1, $2, $3) RETURNING id',
      ['TEST_STOCK', testDate, 123.45]
    );
    console.log(`✅ Test insert successful! ID: ${result.rows[0].id}`);
    
    // Verify it exists
    const check = await db.query(
      'SELECT * FROM daily_prices WHERE id = $1',
      [result.rows[0].id]
    );
    console.log(`✅ Test record verified: ${check.rows[0].ticker} - ${check.rows[0].closing_price}`);
    
    // Clean up
    await db.query('DELETE FROM daily_prices WHERE id = $1', [result.rows[0].id]);
    console.log('✅ Test record cleaned up');
  } catch (error) {
    console.error('❌ Test insert failed:', error.message);
    throw error;
  }
};

const getLatestWeekday = () => {
    let today = new Date();
    const dayOfWeek = today.getDay();

    if (dayOfWeek === 0) { // Sunday
        return subDays(today, 2);
    } else if (dayOfWeek === 6) { // Saturday
        return subDays(today, 1);
    }
    return today;
};

const updateStockPricesFromBhavcopy = async (dateToFetch) => {
  console.log('Fetching and processing NSE Bhavcopy...');
  
  const dateStr = format(dateToFetch, 'yyyyMMdd');
  const bhavcopyUrl = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${dateStr}_F_0000.csv.zip`;
  console.log(`Attempting to download from: ${bhavcopyUrl}`);

  try {
    const response = await axios.get(bhavcopyUrl, { 
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    const zip = new AdmZip(response.data);
    const csvEntry = zip.getEntries().find(entry => entry.entryName.endsWith('.csv'));

    if (!csvEntry) {
      throw new Error('Bhavcopy CSV not found in the ZIP archive.');
    }

    const csvData = zip.readAsText(csvEntry);
    
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = csv({ 
        mapHeaders: ({ header, index }) => {
          const trimmed = header.trim().toUpperCase();
          return trimmed;
        }
      })
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log(`Parsed ${results.length} records from Bhavcopy.`);
          
          // NEW: Debug the actual data structure with new columns
          if (results.length > 0) {
            console.log('🔍 DEBUG: First 3 rows with NEW column format:');
            for (let i = 0; i < Math.min(3, results.length); i++) {
              console.log(`Row ${i}:`, {
                TCKRSYMB: results[i].TCKRSYMB,
                SCTYSRS: results[i].SCTYSRS,
                CLSPRIC: results[i].CLSPRIC,
                FININSTRMTP: results[i].FININSTRMTP,
                LASTPRIC: results[i].LASTPRIC
              });
            }
            
            // Check what FININSTRMTP values exist (this is the new series equivalent)
            const instrTypeCount = {};
            const sampleInstrTypes = new Set();
            results.slice(0, 100).forEach(row => {
              const instrType = row.FININSTRMTP;
              instrTypeCount[instrType] = (instrTypeCount[instrType] || 0) + 1;
              if (instrType) sampleInstrTypes.add(instrType);
            });
            console.log('🔍 FININSTRMTP values distribution:', instrTypeCount);
            console.log('🔍 Sample FININSTRMTP values:', Array.from(sampleInstrTypes));
          }

          let insertedCount = 0;
          let errorCount = 0;
          let equityCount = 0;
          let nonEquityCount = 0;
          let skippedDueToCondition = 0;
          
          for (const row of results) {
            // NEW: Use the new column names
            const ticker = row.TCKRSYMB;
            const series = row.SCTYSRS;
            const instrumentType = row.FININSTRMTP;
            const closingPriceValue = row.CLSPRIC || row.LASTPRIC;
            const priceDate = dateToFetch;

            // NEW: Filter for equity instruments - check both series and instrument type
            // Common equity indicators: 'EQ', 'Equity', 'Common Stock', etc.
            const isEquity = (series === 'EQ' || series === 'BE' || 
                            instrumentType === 'Equity' || instrumentType === 'Common Stock' ||
                            (instrumentType && instrumentType.toLowerCase().includes('equity')));

            if (isEquity) {
              equityCount++;
              
              if (ticker && closingPriceValue && !isNaN(parseFloat(closingPriceValue))) {
                  const closingPrice = parseFloat(closingPriceValue);
                  try {
                    const sql = `
                      INSERT INTO daily_prices (ticker, price_date, closing_price)
                      VALUES ($1, $2, $3)
                      ON CONFLICT (ticker, price_date) DO UPDATE SET closing_price = $3;
                    `;
                    await db.query(sql, [ticker, priceDate, closingPrice]);
                    insertedCount++;
                    
                    // Log first 3 inserts for verification
                    if (insertedCount <= 3) {
                      console.log(`  ✅ Inserted: ${ticker} (${series}) - ${closingPrice}`);
                    }
                  } catch (insertError) {
                    console.error(`Error inserting ${ticker}:`, insertError.message);
                    errorCount++;
                  }
              } else {
                skippedDueToCondition++;
                if (skippedDueToCondition <= 2) {
                  console.log(`  ❌ Skipped: ${ticker} - invalid data (price: ${closingPriceValue})`);
                }
              }
            } else {
              nonEquityCount++;
            }
          }
          
          console.log(`📊 Summary: ${equityCount} equity records, ${nonEquityCount} non-equity records`);
          console.log(`📊 Inserted: ${insertedCount}, Errors: ${errorCount}, Skipped: ${skippedDueToCondition}`);
          console.log(`✅ Stock prices: ${insertedCount} inserted, ${errorCount} errors`);
          
          resolve();
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        });
        
      stream.write(csvData);
      stream.end();
    });

  } catch (error) {
    const errorMessage = `Failed to fetch or process Bhavcopy. The file may not be available yet. Error: ${error.message}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
};

const updateMutualFundNavs = async (dateToFetch) => {
  console.log('Updating Mutual Fund NAVs...');
  const mfHoldingsResult = await db.query(`
    SELECT DISTINCT ticker FROM master_holdings 
    WHERE ticker ~ '^[0-9]+$'`);
  
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
      const [day, month, year] = latestNavData.date.split('-');
      const navDate = new Date(`${year}-${month}-${day}`);

      if (navDate <= dateToFetch) {
        const sql = `
          INSERT INTO daily_prices (ticker, price_date, closing_price)
          VALUES ($1, $2, $3)
          ON CONFLICT (ticker, price_date) DO UPDATE SET closing_price = $3;
        `;
        await db.query(sql, [schemeCode, navDate, nav]);
      }
    } catch (error) {
      console.error(`Failed to update NAV for scheme ${schemeCode}:`, error.message);
    }
  }
  console.log('✅ Mutual Fund NAVs updated.');
};

const recalculateNav = async (dateToFetch) => {
  console.log('Recalculating portfolio NAV...');
  const holdingsResult = await db.query('SELECT ticker, quantity FROM master_holdings WHERE quantity > 0');
  const holdings = holdingsResult.rows;

  let newTotalPortfolioValue = 0;
  for (const holding of holdings) {
    let value = 0;
    if (holding.ticker === 'CASH') {
      value = parseFloat(holding.quantity);
    } else {
      const priceResult = await db.query(
          'SELECT closing_price FROM daily_prices WHERE ticker = $1 AND price_date <= $2 ORDER BY price_date DESC LIMIT 1', 
          [holding.ticker, dateToFetch]
      );
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
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (nav_date) DO UPDATE SET
      nav_value = EXCLUDED.nav_value,
      total_portfolio_value = EXCLUDED.total_portfolio_value;
  `;
  await db.query(navSql, [dateToFetch, newNavValue, newTotalPortfolioValue, totalUnitsOutstanding]);
  console.log('✅ Portfolio NAV recalculated and updated.');
};

module.exports = { updateAllEodPrices };