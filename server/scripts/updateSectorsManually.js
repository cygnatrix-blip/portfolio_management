// server/scripts/updateSectorsManually.js
// Manually update sectors from NSE with multiple fallback sources

const axios = require('axios');
const csv = require('csv-parser');
const db = require('../config/db');
const { Readable } = require('stream');

/**
 * Try multiple NSE sources for sector data
 */
const updateSectorsFromNSE = async () => {
  console.log('🔍 Attempting to download sector data from NSE...\n');
  
  // Multiple NSE sector data sources
  const sources = [
    {
      name: 'Nifty 500',
      url: 'https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv',
      industryColumn: 'INDUSTRY'
    },
    {
      name: 'Nifty 200',
      url: 'https://nsearchives.nseindia.com/content/indices/ind_nifty200list.csv',
      industryColumn: 'INDUSTRY'
    },
    {
      name: 'Nifty Total Market',
      url: 'https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarket_list.csv',
      industryColumn: 'INDUSTRY'
    }
  ];
  
  let sectorData = {};
  let successfulSource = null;
  
  // Try each source until one succeeds
  for (const source of sources) {
    try {
      console.log(`📥 Trying ${source.name}: ${source.url}`);
      
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/csv,text/plain,*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive'
        },
        responseType: 'text',
        timeout: 15000
      });
      
      if (!response.data || response.data.length < 100) {
        console.log(`   ❌ Invalid response from ${source.name}`);
        continue;
      }
      
      console.log(`   ✅ Downloaded ${response.data.length} bytes`);
      
      // Parse CSV
      const parsedData = await new Promise((resolve, reject) => {
        const data = {};
        const stream = Readable.from(response.data);
        
        stream
          .pipe(csv({
            mapHeaders: ({ header }) => header.trim().toUpperCase().replace(/\s+/g, '_'),
            skipLines: 0
          }))
          .on('data', (row) => {
            // Try different possible column names
            const symbol = row.SYMBOL || row.COMPANY || row.TICKER;
            const industry = row[source.industryColumn] || row.SECTOR || row.INDUSTRY || row.INDUSTRY_NAME;
            
            if (symbol && industry) {
              data[symbol.trim()] = industry.trim();
            }
          })
          .on('end', () => resolve(data))
          .on('error', (err) => reject(err));
      });
      
      if (Object.keys(parsedData).length > 0) {
        sectorData = { ...sectorData, ...parsedData };
        successfulSource = source.name;
        console.log(`   ✅ Parsed ${Object.keys(parsedData).length} symbols with sectors from ${source.name}\n`);
      }
      
    } catch (error) {
      console.log(`   ❌ Failed to download from ${source.name}: ${error.message}\n`);
    }
  }
  
  if (Object.keys(sectorData).length === 0) {
    throw new Error('Could not download sector data from any NSE source');
  }
  
  console.log(`\n📊 Total symbols with sector info: ${Object.keys(sectorData).length}`);
  console.log(`   Primary source: ${successfulSource}\n`);
  
  return sectorData;
};

/**
 * Update database with sector information
 */
const updateDatabaseSectors = async (sectorData) => {
  console.log('💾 Updating database with sector information...\n');
  
  let updatedCount = 0;
  let notFoundCount = 0;
  
  for (const [ticker, sector] of Object.entries(sectorData)) {
    try {
      const result = await db.query(
        `UPDATE nse_symbols 
         SET sector = $1, industry = $1 
         WHERE ticker = $2
         RETURNING ticker`,
        [sector, ticker]
      );
      
      if (result.rowCount > 0) {
        updatedCount++;
        if (updatedCount <= 10) {
          console.log(`   ✅ ${ticker} → ${sector}`);
        } else if (updatedCount === 11) {
          console.log(`   ... (showing first 10)`);
        }
      } else {
        notFoundCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error updating ${ticker}: ${error.message}`);
    }
  }
  
  console.log(`\n📈 Update Summary:`);
  console.log(`   - Symbols updated: ${updatedCount}`);
  console.log(`   - Symbols not in DB: ${notFoundCount}`);
  console.log(`   - Total processed: ${Object.keys(sectorData).length}\n`);
  
  return updatedCount;
};

/**
 * Show sector distribution
 */
const showSectorStats = async () => {
  console.log('📊 Sector Distribution in Database:\n');
  
  const result = await db.query(`
    SELECT 
      sector,
      COUNT(*) as count
    FROM nse_symbols
    WHERE sector IS NOT NULL
    GROUP BY sector
    ORDER BY count DESC
    LIMIT 15
  `);
  
  console.log('   Top Sectors:');
  result.rows.forEach(row => {
    console.log(`   - ${row.sector}: ${row.count} stocks`);
  });
  
  const nullCount = await db.query(
    'SELECT COUNT(*) as count FROM nse_symbols WHERE sector IS NULL'
  );
  console.log(`\n   Stocks without sector: ${nullCount.rows[0].count}`);
};

/**
 * Main execution
 */
const main = async () => {
  try {
    console.log('🚀 Starting Manual Sector Update\n');
    console.log('='.repeat(60) + '\n');
    
    // Step 1: Download sector data
    const sectorData = await updateSectorsFromNSE();
    
    // Step 2: Update database
    const updated = await updateDatabaseSectors(sectorData);
    
    if (updated > 0) {
      // Step 3: Show statistics
      await showSectorStats();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ Sector update completed successfully!\n');
    } else {
      console.log('\n⚠️  No sectors were updated. Check if symbols exist in database.\n');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Sector update failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check internet connection');
    console.error('2. Verify NSE website is accessible');
    console.error('3. Try running again in a few minutes\n');
    process.exit(1);
  }
};

main();
