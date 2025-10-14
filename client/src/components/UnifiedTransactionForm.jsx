import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Autocomplete,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';

const UnifiedTransactionForm = () => {
  const [formData, setFormData] = useState({
    transaction_type: 'buy',
    ticker: '',
    quantity: '',
    price_per_share: '',
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ msg: '', type: '' });

  useEffect(() => {
    const fetchAssets = async () => {
      if (searchQuery.length < 2) {
        setOptions([]);
        return;
      }
      setLoading(true);

      try {
        const [stockRes, mfRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/assets/search-stocks?query=${searchQuery}`),
          axios.get(`http://localhost:5000/api/assets/search-mf?query=${searchQuery}`),
        ]);

        const combinedOptions = [...stockRes.data, ...mfRes.data];
        setOptions(combinedOptions);
      } catch (err) {
        console.error("Asset search failed", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchAssets();
    }, 500); // Debounce API calls by 500ms

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAutocompleteChange = (event, newValue) => {
    if (newValue) {
      // For stocks, we get 'RELIANCE.NS', so we strip the suffix
      const ticker = newValue.type === 'Stock' 
        ? newValue.symbol.replace('.NS', '') 
        : newValue.symbol;
      
      setFormData({ ...formData, ticker });
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitStatus({ msg: '', type: '' });

  try {
    const endpoint = '/api/transactions';
    
    const quantity = parseFloat(formData.quantity);
    const pricePerShare = parseFloat(formData.price_per_share);

    const payload = {
      ticker: formData.ticker,
      quantity: quantity,
      price_per_share: pricePerShare,
      // Adding .trim() as a safeguard against whitespace
      transaction_type: formData.transaction_type.trim().toUpperCase(),
      total_value: quantity * pricePerShare,
    };

    // CRITICAL DEBUGGING STEP: This will show the exact data being sent.
    console.log('Sending transaction payload:', payload);

    await axios.post(`http://localhost:5000${endpoint}`, payload);
    
    setSubmitStatus({ msg: 'Transaction recorded successfully!', type: 'success' });
    
    setFormData({
      transaction_type: 'buy',
      ticker: '',
      quantity: '',
      price_per_share: '',
    });

  } catch (err) {
    console.error("Error submitting transaction", err);
    const errorMsg = err.response?.data?.msg || 'An unknown error occurred.';
    console.error("Server responded with:", err.response?.data);
    setSubmitStatus({ msg: `Failed to record transaction: ${errorMsg}`, type: 'error' });
  }
};

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, gap: 2, display: 'flex', flexDirection: 'column' }}>
      {submitStatus.msg && (
        <Typography color={submitStatus.type === 'success' ? 'green' : 'red'}>
          {submitStatus.msg}
        </Typography>
      )}

      {/* Client Selection FormControl has been removed */}
      
      <FormControl fullWidth required>
        <InputLabel>Transaction Type</InputLabel>
        <Select
          name="transaction_type"
          value={formData.transaction_type}
          label="Transaction Type"
          onChange={handleFormChange}
        >
          <MenuItem value="buy">Buy</MenuItem>
          <MenuItem value="sell">Sell</MenuItem>
        </Select>
      </FormControl>
      
      <Autocomplete
        options={options}
        getOptionLabel={(option) => `[${option.type}] ${option.name} (${option.symbol})`}
        loading={loading}
        onInputChange={(event, newInputValue) => {
          setSearchQuery(newInputValue);
        }}
        onChange={handleAutocompleteChange}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search for a Stock or Mutual Fund"
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />

      <TextField
        name="ticker"
        label="Symbol / Scheme Code"
        value={formData.ticker}
        onChange={handleFormChange}
        variant="outlined"
        fullWidth
        required
        InputProps={{
          readOnly: true,
        }}
      />

      <TextField
        name="quantity"
        label="Quantity"
        type="number"
        value={formData.quantity}
        onChange={handleFormChange}
        variant="outlined"
        fullWidth
        required
      />
      
      <TextField
        name="price_per_share"
        label="Price Per Share"
        type="number"
        value={formData.price_per_share}
        onChange={handleFormChange}
        variant="outlined"
        fullWidth
        required
        InputProps={{ inputProps: { step: "0.01" } }}
      />

      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
        Submit Transaction
      </Button>
    </Paper>
  );
};

export default UnifiedTransactionForm;

