import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    CircularProgress,
    Alert
} from '@mui/material';

const DailyPriceForm = () => {
  const [holdings, setHoldings]  = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch all the current non-cash holdings to create the form fields
  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/portfolio/holdings');
        // We only care about stocks, not CASH
        const stockHoldings = response.data.filter(h => h.ticker !== 'CASH');
        setHoldings(stockHoldings);
      } catch (err) {
        console.error("Could not fetch holdings for price form", err);
        setError('Could not load holdings.');
      } finally {
        setLoading(false);
      }
    };
    fetchHoldings();
  }, []);

  const handlePriceChange = (ticker, value) => {
    setPrices({
      ...prices,
      [ticker]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Format the data for the API
    const priceData = Object.keys(prices).map(ticker => ({
      ticker,
      price: parseFloat(prices[ticker])
    }));

    if (priceData.length === 0) {
        alert("Please enter at least one price.");
        return;
    }

    try {
      await axios.post('http://localhost:5000/api/prices', { prices: priceData });
      alert('Daily prices have been updated successfully!');
      // Reload to see the effect on the dashboard
      window.location.reload();
    } catch (err) {
      console.error("Error submitting prices", err);
      alert('Failed to update prices.');
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>EOD Price Update</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
        Enter the closing market price for each holding.
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      {holdings.length === 0 && !loading && (
         <Typography color="text.secondary">No stock holdings found to price.</Typography>
      )}

      {holdings.map(holding => (
        <TextField
            key={holding.id}
            fullWidth
            type="number"
            name={holding.ticker}
            label={`Price for ${holding.ticker}`}
            variant="outlined"
            onChange={(e) => handlePriceChange(holding.ticker, e.target.value)}
            required
            InputProps={{ inputProps: { step: "0.01" } }}
        />
      ))}
      
      <Button 
        type="submit" 
        variant="contained" 
        color="secondary" 
        sx={{ mt: 2, py: 1.5 }}
        disabled={holdings.length === 0}
      >
        Update All Prices for Today
      </Button>
    </Paper>
  );
};

export default DailyPriceForm;
