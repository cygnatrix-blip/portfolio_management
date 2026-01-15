// services/updateIndicesService.js
const axios = require('axios');
const csv = require('csv-parser');
const { format, subDays, addDays, parseISO } = require('date-fns');
const db = require('../config/db');
const { Readable } = require('stream');

/**
 * Map of NSE index names to our database symbols
 */
const INDEX_MAPPING = {
  'Nifty 50': 'NIFTY50',
  'Nifty 500': 'NIFTY500'
};

/**
 * Helper function to delay execution (to avoid rate limiting)
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch index data from NSE for a specific date
 * NSE Index Bhavcopy URL: https://archives.nseindia.com/content/indices/ind_close_all_[DDMMYYYY].csv
 */
const fetchNseIndexDataForDate = async (dateToFetch) => {
  const dateStr = format(dateToFetch, 'ddMMyyyy');
  const url = `https://archives.nseindia.com/content/indices/ind_close_all_${dateStr}.csv`;
  
  console.log(`  📥 Fetching NSE index data for ${format(dateToFetch, 'dd-MM-yyyy')}...`);
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/csv,application/csv,text/plain'
      },
      timeout: 10000
    });

    if (!response.data || response.data.length === 0) {
      return { success: false, reason: 'Empty response', data: [] };
    }

    // Parse CSV data
    const results = [];
    const stream = Readable.from([response.data]);
    
    return new Promise((resolve, reject) => {
      stream
        .pipe(csv({ 
          mapHeaders: ({ header }) => header.trim(),
          skipLines: 0
        }))
        .on('data', (row) => {
          const indexName = row['Index Name']?.trim();
          const closingValue = row['Closing Index Value']?.trim();
          
          if (indexName && closingValue && INDEX_MAPPING[indexName]) {
            results.push({
              indexName: indexName,
              dbSymbol: INDEX_MAPPING[indexName],
              closingValue: parseFloat(closingValue.replace(/,/g, '')),
              date: dateToFetch
            });
          }
        })
        .on('end', () => {
          resolve({ success: true, data: results, date: dateToFetch });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  } catch (error) {
    if (error.response?.status === 404) {
      return { success: false, reason: 'Data not available (weekend/holiday)', data: [] };
    }
    throw error;
  }
};

/**
 * Fetches and stores index data from NSE for a date range
 */
const fetchAndStoreIndexData = async (dbSymbol) => {
  console.log(`📊 Starting update for ${dbSymbol}...`);
  
  try {
    // 1. Find the latest date we have in the DB for this symbol
    const lastEntry = await db.query(
      `SELECT price_date FROM index_history 
       WHERE symbol = $1 
       ORDER BY price_date DESC 
       LIMIT 1`,
      [dbSymbol]
    );

    let startDate;
    
    if (lastEntry.rows.length > 0) {
      const lastDate = new Date(lastEntry.rows[0].price_date);
      const nextDay = addDays(lastDate, 1);
      startDate = nextDay;
      
      // If nextDay is in the future, don't fetch
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (nextDay > today) {
        console.log(`✅ ${dbSymbol} already up to date. Last data: ${format(lastDate, 'yyyy-MM-dd')}`);
        return { 
          insertedCount: 0, 
          message: 'Already up to date',
          lastDate: format(lastDate, 'yyyy-MM-dd')
        };
      }
    } else {
      // If no data exists, start from a reasonable date
      startDate = new Date('2020-01-01');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = subDays(today, 0); // Up to yesterday or today

    console.log(`🔍 Fetching ${dbSymbol} data from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}...`);

    let insertedCount = 0;
    let currentDate = new Date(startDate);
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const insertSql = `
        INSERT INTO index_history (symbol, price_date, closing_price)
        VALUES ($1, $2, $3)
        ON CONFLICT (symbol, price_date) DO NOTHING
        RETURNING *
      `;
      
      // Iterate through each date
      while (currentDate <= endDate) {
        try {
          const result = await fetchNseIndexDataForDate(currentDate);
          
          if (result.success && result.data.length > 0) {
            // Find data for our specific index
            const indexData = result.data.find(d => d.dbSymbol === dbSymbol);
            
            if (indexData) {
              const res = await client.query(insertSql, [
                dbSymbol,
                currentDate,
                indexData.closingValue
              ]);
              
              if (res.rowCount > 0) {
                insertedCount++;
                console.log(`  ✅ ${format(currentDate, 'dd-MM-yyyy')}: ${indexData.closingValue}`);
              }
            }
          } else if (result.reason) {
            console.log(`  ⏭️  ${format(currentDate, 'dd-MM-yyyy')}: ${result.reason}`);
          }
          
          // Add small delay to avoid rate limiting
          await delay(500);
          
        } catch (dateError) {
          console.log(`  ⚠️  ${format(currentDate, 'dd-MM-yyyy')}: ${dateError.message}`);
        }
        
        currentDate = addDays(currentDate, 1);
      }
      
      await client.query('COMMIT');
      console.log(`✅ Successfully updated ${dbSymbol}. Inserted ${insertedCount} new rows.`);
      
      return { 
        insertedCount, 
        message: 'Success',
        dataRange: {
          from: format(startDate, 'yyyy-MM-dd'),
          to: format(endDate, 'yyyy-MM-dd')
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
  console.log('--- Starting Index History Update (NSE Source) ---');
  const startTime = Date.now();
  
  const results = {
    nifty50: { success: false, insertedCount: 0, error: null, source: 'NSE', dbSymbol: 'NIFTY50' },
    nifty500: { success: false, insertedCount: 0, error: null, source: 'NSE', dbSymbol: 'NIFTY500' },
    timestamp: new Date().toISOString(),
    duration: 0
  };
  
  try {
    // Update Nifty 50
    console.log('\n🟡 Processing NIFTY 50...');
    try {
      const nifty50Result = await fetchAndStoreIndexData('NIFTY50');
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
    
    // Add delay between index updates
    console.log('\n⏸️  Waiting 2 seconds before next index...');
    await delay(2000);
    
    // Update Nifty 500 
    console.log('\n🟡 Processing NIFTY 500...');
    try {
      const nifty500Result = await fetchAndStoreIndexData('NIFTY500');
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