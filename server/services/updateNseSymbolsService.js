// server/services/updateNseSymbolsService.js
const axios = require('axios');
const csv = require('csv-parser');
const db = require('../config/db');
const { Readable } = require('stream');

/**
 * Updates NSE Symbol Master List with Sector Information
 * Source: NSE India official equity list + sector classification
 * Runs: Weekly (symbols don't change frequently)
 */
const updateNseSymbols = async () => {
  console.log('--- Starting NSE Symbol Master Update ---');
  
  try {
    // Step 1: Download basic equity list
    const nseSymbolUrl = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv';
    
    console.log('Downloading NSE Equity Symbol List...');
    const response = await axios.get(nseSymbolUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/csv'
      },
      responseType: 'text'
    });

    const csvData = response.data;
    
    // Step 2: Download sector classification from multiple sources
    console.log('Downloading NSE Sector Classification...');
    let sectorData = {};
    
    const sectorSources = [
      'https://nsearchives.nseindia.com/content/indices/ind_nifty500list.csv',
      'https://nsearchives.nseindia.com/content/indices/ind_nifty200list.csv',
      'https://nsearchives.nseindia.com/content/indices/ind_niftytotalmarket_list.csv'
    ];
    
    for (const nseSectorUrl of sectorSources) {
      try {
        console.log(`Trying ${nseSectorUrl}...`);
        const sectorResponse = await axios.get(nseSectorUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/csv,text/plain,*/*',
            'Accept-Encoding': 'gzip, deflate, br'
          },
          responseType: 'text',
          timeout: 15000
        });
        
        if (sectorResponse.data && sectorResponse.data.length > 100) {
          // Parse sector data
          const sectorResults = await new Promise((resolve) => {
            const data = {};
            const stream = Readable.from(sectorResponse.data);
            
            stream
              .pipe(csv({
                mapHeaders: ({ header }) => header.trim().toUpperCase().replace(/\s+/g, '_'),
                skipLines: 0
              }))
              .on('data', (row) => {
                const symbol = row.SYMBOL || row.COMPANY || row.TICKER;
                const sector = row.INDUSTRY || row.SECTOR || row.INDUSTRY_NAME;
                
                if (symbol && sector) {
                  data[symbol.trim()] = sector.trim();
                }
              })
              .on('end', () => resolve(data))
              .on('error', () => resolve({}));
          });
          
          // Merge sector data
          sectorData = { ...sectorData, ...sectorResults };
          console.log(`✅ Loaded ${Object.keys(sectorResults).length} sectors from this source.`);
        }
      } catch (sectorError) {
        console.warn(`Could not download from ${nseSectorUrl}: ${sectorError.message}`);
      }
    }
    
    console.log(`Total sector info loaded: ${Object.keys(sectorData).length} symbols.`);
    if (Object.keys(sectorData).length === 0) {
      console.warn('⚠️  No sector data available - run updateSectorsManually.js later');
    }
    
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(csvData);
      
      stream
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toUpperCase(),
          skipLines: 0
        }))
        .on('data', (row) => {
          // NSE CSV columns: SYMBOL, NAME OF COMPANY, SERIES, DATE OF LISTING, PAID UP VALUE, MARKET LOT, ISIN NUMBER, FACE VALUE
          const symbol = row.SYMBOL || row['SYMBOL'];
          const companyName = row['NAME OF COMPANY'] || row.NAME || row['COMPANY NAME'];
          const series = row.SERIES || row[' SERIES'];
          const isin = row['ISIN NUMBER'] || row.ISIN || row['ISIN NO'];
          
          if (symbol && companyName) {
            results.push({
              ticker: symbol.trim(),
              company_name: companyName.trim(),
              series: series ? series.trim() : null,
              isin: isin ? isin.trim() : null,
              sector: sectorData[symbol.trim()] || null
            });
          }
        })
        .on('end', async () => {
          console.log(`Parsed ${results.length} symbols from NSE.`);
          
          let insertedCount = 0;
          let updatedCount = 0;
          let errorCount = 0;
          let withSectorCount = 0;
          
          for (const symbol of results) {
            try {
              const sql = `
                INSERT INTO nse_symbols (ticker, company_name, series, isin, sector, last_updated)
                VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                ON CONFLICT (ticker) DO UPDATE SET
                  company_name = EXCLUDED.company_name,
                  series = EXCLUDED.series,
                  isin = EXCLUDED.isin,
                  sector = COALESCE(EXCLUDED.sector, nse_symbols.sector),
                  last_updated = CURRENT_DATE
                RETURNING (xmax = 0) AS inserted;
              `;
              
              const result = await db.query(sql, [
                symbol.ticker,
                symbol.company_name,
                symbol.series,
                symbol.isin,
                symbol.sector
              ]);
              
              if (result.rows[0].inserted) {
                insertedCount++;
              } else {
                updatedCount++;
              }
              
              if (symbol.sector) withSectorCount++;
            } catch (insertError) {
              console.error(`Error inserting ${symbol.ticker}:`, insertError.message);
              errorCount++;
            }
          }
          
          console.log(`✅ NSE Symbols Updated:`);
          console.log(`   - New: ${insertedCount}`);
          console.log(`   - Updated: ${updatedCount}`);
          console.log(`   - With Sector Info: ${withSectorCount}`);
          console.log(`   - Errors: ${errorCount}`);
          console.log(`   - Total in database: ${insertedCount + updatedCount}`);
          
          resolve();
        })
        .on('error', (error) => {
          console.error('CSV parsing error:', error);
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('Failed to update NSE symbols:', error.message);
    // Don't throw - symbol update is not critical for daily operations
    console.log('Continuing without symbol update...');
  }
};

/**
 * Check if symbols need update (weekly)
 */
const shouldUpdateSymbols = async () => {
  try {
    const result = await db.query(
      'SELECT MAX(last_updated) as last_update FROM nse_symbols'
    );
    
    if (!result.rows[0].last_update) {
      console.log('No symbols found - will update now.');
      return true;
    }
    
    const lastUpdate = new Date(result.rows[0].last_update);
    const daysSinceUpdate = Math.floor((new Date() - lastUpdate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceUpdate >= 7) {
      console.log(`Symbols last updated ${daysSinceUpdate} days ago - will update now.`);
      return true;
    }
    
    console.log(`Symbols updated ${daysSinceUpdate} days ago - no update needed.`);
    return false;
  } catch (error) {
    console.error('Error checking symbol update status:', error.message);
    return true; // Update on error to be safe
  }
};

module.exports = {
  updateNseSymbols,
  shouldUpdateSymbols
};
