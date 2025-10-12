const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;
const db = require('../config/db');

// Export individual functions so they can be used by priceController
const fetchFromYahooFinance = async () => {
  const symbol = '^NSEI';
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  const queryOptions = {
    period1: threeMonthsAgo.toISOString().split('T')[0],
    period2: new Date().toISOString().split('T')[0],
    interval: '1d'
  };

  const result = await yahooFinance.historical(symbol, queryOptions);
  
  return result.map(item => ({
    date: item.date.toISOString().split('T')[0],
    price: item.close,
    open: item.open,
    high: item.high,
    low: item.low,
    volume: item.volume
  })).reverse();
};

// Alpha Vantage implementation (with multiple symbol attempts)
const fetchFromAlphaVantage = async () => {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  const symbols = ['NSEI', '^NSEI', 'NIFTY_50.NS'];
  
  for (const symbol of symbols) {
    try {
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`;
      const response = await axios.get(url, { timeout: 10000 });
      const data = response.data;
      
      if (data['Time Series (Daily)']) {
        const timeSeries = data['Time Series (Daily)'];
        return Object.entries(timeSeries).map(([date, values]) => ({
          date: date,
          price: parseFloat(values['4. close']),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          volume: parseInt(values['5. volume'])
        }));
      }
    } catch (error) {
      console.log(`Alpha Vantage symbol ${symbol} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All Alpha Vantage symbols failed');
};

// FMP implementation
const fetchFromFMP = async () => {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) throw new Error('FMP API key not configured');
  
  const url = `https://financialmodelingprep.com/api/v3/historical-chart/1day/NSEI?apikey=${apiKey}`;
  const response = await axios.get(url, { timeout: 10000 });
  
  return response.data.map(item => ({
    date: item.date.split(' ')[0],
    price: item.close,
    open: item.open,
    high: item.high,
    low: item.low,
    volume: item.volume
  }));
};

// Store function
const storeNiftyDataInDB = async (niftyData) => {
  try {
    // We'll keep historical data, just update recent entries (no DELETE)
    for (const item of niftyData) {
      await db.query(
        `INSERT INTO index_history (symbol, price_date, closing_price) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (symbol, price_date) DO UPDATE SET closing_price = $3`,
        ['NIFTY50', item.date, item.price]
      );
    }
    
    console.log(`Stored/updated ${niftyData.length} Nifty 50 records in database`);
  } catch (error) {
    console.error('Error storing Nifty data in DB:', error);
  }
};

// Get cached data function
const getCachedNiftyData = async () => {
  try {
    const result = await db.query(
      `SELECT symbol, price_date as date, closing_price as price 
       FROM index_history 
       WHERE symbol = $1 
       ORDER BY price_date DESC 
       LIMIT 100`,
      ['NIFTY50']
    );
    
    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0], // Ensure consistent format
      price: parseFloat(row.price),
      symbol: row.symbol
    }));
  } catch (error) {
    console.error('Error fetching cached Nifty data:', error);
    return [];
  }
};

// Main function (your existing endpoint)
const fetchNifty50Data = async (req, res) => {
  try {
    console.log('Attempting to fetch Nifty 50 data...');
    
    let niftyData = [];
    
    // Try Yahoo Finance first
    try {
      niftyData = await fetchFromYahooFinance();
      console.log(`Successfully fetched ${niftyData.length} records from Yahoo Finance`);
    } catch (yahooError) {
      console.log('Yahoo Finance failed, trying Alpha Vantage...');
      
      // Fallback to Alpha Vantage
      try {
        niftyData = await fetchFromAlphaVantage();
        console.log(`Successfully fetched ${niftyData.length} records from Alpha Vantage`);
      } catch (alphaError) {
        console.log('Alpha Vantage failed, trying FMP...');
        
        // Fallback to FMP
        try {
          niftyData = await fetchFromFMP();
          console.log(`Successfully fetched ${niftyData.length} records from FMP`);
        } catch (fmpError) {
          throw new Error('All APIs failed: ' + [yahooError.message, alphaError.message, fmpError.message].join('; '));
        }
      }
    }

    // Store in database
    if (niftyData.length > 0) {
      await storeNiftyDataInDB(niftyData);
    }

    res.json(niftyData);

  } catch (error) {
    console.error('All data sources failed:', error.message);
    
    // Final fallback - cached data from database
    try {
      const cachedData = await getCachedNiftyData();
      if (cachedData.length > 0) {
        console.log('Returning cached Nifty 50 data');
        return res.json(cachedData);
      }
    } catch (dbError) {
      console.error('Failed to get cached data:', dbError);
    }

    res.status(500).json({ 
      error: 'Failed to fetch Nifty 50 data from all sources',
      message: error.message 
    });
  }
};

// Export all functions
module.exports = {
  fetchNifty50Data,
  getNifty50Data: fetchNifty50Data,
  fetchFromYahooFinance,
  fetchFromAlphaVantage,
  fetchFromFMP,
  storeNiftyDataInDB,
  getCachedNiftyData
};