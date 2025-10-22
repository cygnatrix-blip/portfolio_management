// services/updateIndicesService.js
const yahooFinance = require('yahoo-finance2').default;
const db = require('../config/db');

/**
 * Fetches historical data from Yahoo Finance and stores it in your database.
 * @param {string} yahooSymbol - The symbol Yahoo Finance uses (e.g., '^NSEI')
 * @param {string} dbSymbol - The symbol you use in your DB (e.g., 'NIFTY50')
 */
const fetchAndStoreIndexData = async (yahooSymbol, dbSymbol) => {
  console.log(`📊 Starting update for ${dbSymbol} (${yahooSymbol})...`);
  
  try {
    // 1. Find the latest date we have in the DB for this symbol
    const lastEntry = await db.query(
      `SELECT price_date FROM index_history 
       WHERE symbol = $1 
       ORDER BY price_date DESC 
       LIMIT 1`,
      [dbSymbol]
    );

    let startDate = '2020-01-01'; // Default start date if no data exists
    let needsUpdate = true;
    
    if (lastEntry.rows.length > 0) {
      const lastDate = new Date(lastEntry.rows[0].price_date);
      const nextDay = new Date(lastDate);
      nextDay.setDate(nextDay.getDate() + 1);
      startDate = nextDay.toISOString().split('T')[0];
      
      // If nextDay is in the future (like on weekends), don't fetch
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (nextDay > today) {
        console.log(`✅ ${dbSymbol} already up to date. Last data: ${lastDate.toISOString().split('T')[0]}`);
        needsUpdate = false;
        return { 
          insertedCount: 0, 
          message: 'Already up to date',
          lastDate: lastDate.toISOString().split('T')[0]
        };
      }
    }

    if (!needsUpdate) {
      return { insertedCount: 0, message: 'No update needed' };
    }

    console.log(`🔍 Fetching ${dbSymbol} data from ${startDate}...`);

    // 2. Fetch historical data from Yahoo Finance using chart() method
    const queryOptions = {
      period1: startDate,
      interval: '1d'
    };
    
    let historicalData;
    try {
      historicalData = await yahooFinance.chart(yahooSymbol, queryOptions);
    } catch (yahooError) {
      console.error(`❌ Yahoo Finance error for ${yahooSymbol}:`, yahooError.message);
      throw new Error(`Yahoo Finance API error: ${yahooError.message}`);
    }
    
    if (!historicalData || !historicalData.quotes || historicalData.quotes.length === 0) {
      console.log(`ℹ️  No new data found for ${dbSymbol} from ${startDate}`);
      return { insertedCount: 0, message: 'No new data available' };
    }

    // Filter out null quotes and ensure we have valid data
    const validQuotes = historicalData.quotes.filter(quote => 
      quote.date && quote.close && !isNaN(quote.close)
    );

    if (validQuotes.length === 0) {
      console.log(`⚠️  No valid data points found for ${dbSymbol}`);
      return { insertedCount: 0, message: 'No valid data points' };
    }

    console.log(`📥 Retrieved ${validQuotes.length} data points for ${dbSymbol}`);

    // 3. Insert data into database
    let insertedCount = 0;
    const client = await db.pool.connect(); 
    
    try {
      await client.query('BEGIN');
      
      const insertSql = `
        INSERT INTO index_history (symbol, price_date, closing_price)
        VALUES ($1, $2, $3)
        ON CONFLICT (symbol, price_date) DO NOTHING 
      `;
      
      for (const quote of validQuotes) {
        const res = await client.query(insertSql, [dbSymbol, quote.date, quote.close]);
        if (res.rowCount > 0) {
          insertedCount++;
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ Successfully updated ${dbSymbol}. Inserted ${insertedCount} new rows.`);
      
      return { 
        insertedCount, 
        message: 'Success',
        dataRange: {
          from: validQuotes[0].date.toISOString().split('T')[0],
          to: validQuotes[validQuotes.length - 1].date.toISOString().split('T')[0]
        }
      };

    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error(`❌ Database error for ${dbSymbol}:`, dbError.message);
      throw new Error(`Database error: ${dbError.message}`);
    } finally {
      client.release();
    }

  } catch (error) {
    console.error(`💥 Error updating ${dbSymbol}:`, error.message);
    throw error;
  }
};

/**
 * Main function to run the updates for all required indices
 */
const updateAllIndices = async () => {
  console.log('--- Starting Index History Update ---');
  const startTime = Date.now();
  
  const results = {
    nifty50: { success: false, insertedCount: 0, error: null, yahooSymbol: '^NSEI', dbSymbol: 'NIFTY50' },
    nifty500: { success: false, insertedCount: 0, error: null, yahooSymbol: '^CRSLDX', dbSymbol: 'NIFTY500' },
    timestamp: new Date().toISOString(),
    duration: 0
  };
  
  try {
    // Update Nifty 50
    console.log('\n🟡 Processing NIFTY 50...');
    try {
      const nifty50Result = await fetchAndStoreIndexData('^NSEI', 'NIFTY50');
      results.nifty50.success = true;
      results.nifty50.insertedCount = nifty50Result.insertedCount;
      results.nifty50.message = nifty50Result.message;
      if (nifty50Result.dataRange) {
        results.nifty50.dataRange = nifty50Result.dataRange;
      }
    } catch (error) {
      results.nifty50.error = error.message;
      console.error('❌ NIFTY 50 update failed:', error.message);
    }
    
    // Update Nifty 500 
    console.log('\n🟡 Processing NIFTY 500...');
    try {
      const nifty500Result = await fetchAndStoreIndexData('^CRSLDX', 'NIFTY500');
      results.nifty500.success = true;
      results.nifty500.insertedCount = nifty500Result.insertedCount;
      results.nifty500.message = nifty500Result.message;
      if (nifty500Result.dataRange) {
        results.nifty500.dataRange = nifty500Result.dataRange;
      }
    } catch (error) {
      results.nifty500.error = error.message;
      console.error('❌ NIFTY 500 update failed:', error.message);
    }
    
    // Calculate duration
    results.duration = Date.now() - startTime;
    
    // Summary
    console.log('\n--- Index History Update Complete ---');
    console.log('📈 Update Summary:');
    console.log(`   NIFTY 50: ${results.nifty50.success ? '✅' : '❌'} ${results.nifty50.insertedCount} new rows - ${results.nifty50.message}`);
    console.log(`   NIFTY 500: ${results.nifty500.success ? '✅' : '❌'} ${results.nifty500.insertedCount} new rows - ${results.nifty500.message}`);
    console.log(`   ⏱️  Duration: ${results.duration}ms`);
    
    return results;
  } catch (error) {
    console.error('💥 Critical error during indices update:', error);
    results.duration = Date.now() - startTime;
    throw error;
  }
};

module.exports = {
  updateAllIndices,
  fetchAndStoreIndexData
};