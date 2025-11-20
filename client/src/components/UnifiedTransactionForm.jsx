// client/src/components/UnifiedTransactionForm.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  InputAdornment,
} from '@mui/material';
// --- 1. IMPORT IS NOW UNCOMMENTED ---
import AssetAutocomplete from './AssetAutocomplete'; 

// Get token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Helper to format currency
const formatCurrency = (value, fractionDigits = 2) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

// This single function now handles all transaction types
const createTransaction = async (transactionData) => {
  const token = getAuthToken();
  const { data } = await axios.post(
    '/api/transactions', // <-- The single, unified endpoint
    transactionData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data;
};

const UnifiedTransactionForm = ({ portfolioId, onClose, defaultType = 'BUY' }) => {
  const queryClient = useQueryClient();
  const [transactionType, setTransactionType] = useState(defaultType);
  const [error, setError] = useState(null);

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');

  const isClientTx =
    transactionType === 'DEPOSIT' || transactionType === 'WITHDRAWAL';

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      // Refetch all relevant data
      queryClient.invalidateQueries({ queryKey: ['portfolioDetail', String(portfolioId)] });
      queryClient.invalidateQueries({ queryKey: ['overallDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['assetTransactions', String(portfolioId)] });
      queryClient.invalidateQueries({ queryKey: ['clientTransactions', String(portfolioId)] });
      setError(null);
      if (onClose) onClose();
      
      setTicker('');
      setQuantity('');
      setPrice('');
      setAmount('');
    },
    onError: (err) => {
      console.error('Error submitting transaction:', err);
      setError(err.response?.data?.message || 'Transaction failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    let payload = {
      portfolio_id: portfolioId,
      transaction_type: transactionType,
    };

    try {
      if (isClientTx) {
        payload.amount = parseFloat(amount);
        if (isNaN(payload.amount) || payload.amount <= 0) {
          setError('Please enter a valid, positive amount.');
          return;
        }
      } else {
        const q = parseFloat(quantity);
        const p = parseFloat(price);
        const total_value = q * p;

        if (!ticker) {
          setError('Please select an asset.');
          return;
        }
        if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
          setError('Please enter valid, positive numbers for quantity and price.');
          return;
        }
        payload.ticker = ticker.toUpperCase();
        payload.quantity = q;
        payload.price_per_share = p;
        payload.total_value = total_value;
      }
      
      console.log("Sending transaction payload:", payload);
      mutation.mutate(payload);

    } catch (parseError) {
      console.error('Data parsing error:', parseError);
      setError('Please check your inputs. All numbers must be valid.');
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 1, 
      }}
    >
      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <FormControl fullWidth>
        <InputLabel id="tx-type-label">Transaction Type</InputLabel>
        <Select
          labelId="tx-type-label"
          value={transactionType}
          label="Transaction Type"
          onChange={(e) => setTransactionType(e.target.value)}
        >
          <MenuItem value="BUY">BUY (Stock/MF)</MenuItem>
          <MenuItem value="SELL">SELL (Stock/MF)</MenuItem>
          <MenuItem value="DEPOSIT">DEPOSIT (Cash)</MenuItem>
          <MenuItem value="WITHDRAWAL">WITHDRAWAL (Cash)</MenuItem>
        </Select>
      </FormControl>

      {isClientTx ? (
        // Fields for DEPOSIT / WITHDRAWAL
        <TextField
          label="Amount"
          type="number"
          variant="outlined"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">₹</InputAdornment>
            ),
          }}
        />
      ) : (
        // Fields for BUY / SELL
        <>
          {/* --- 2. PLACEHOLDER IS NOW COMMENTED OUT ---
          <TextField
            label="Ticker Symbol (e.g., RELIANCE.NS)"
            variant="outlined"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            required
            fullWidth
          />
          */}

          {/* --- 3. AUTOCOMPLETE COMPONENT IS NOW ACTIVE --- */}
          <AssetAutocomplete 
            onAssetSelected={(asset) => setTicker(asset ? asset.symbol : '')} 
          />

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Quantity"
                type="number"
                variant="outlined"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                fullWidth
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Price per Share"
                type="number"
                variant="outlined"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            Total Value: 
            {formatCurrency(parseFloat(quantity) * parseFloat(price) || 0)}
          </Typography>
        </>
      )}

      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <CircularProgress size={24} /> : 'Submit Transaction'}
      </Button>
    </Box>
  );
};

export default UnifiedTransactionForm;