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
  const [autocompleteKey, setAutocompleteKey] = useState(0);

  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');

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
      
      // Clear all form fields
      setTicker('');
      setQuantity('');
      setPrice('');
      setAmount('');
      setStopLossPrice('');
      setTargetPrice('');
      // Reset autocomplete by changing its key
      setAutocompleteKey(prev => prev + 1);
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
        // Check for fractional quantity (not allowed for stocks/mutual funds)
        if (!Number.isInteger(q)) {
          setError('Quantity must be a whole number. Fractional shares are not allowed.');
          return;
        }
        payload.ticker = ticker.toUpperCase();
        payload.quantity = q;
        payload.price_per_share = p;
        payload.total_value = total_value;
        
        // Add stop loss price for BUY transactions if provided
        if (transactionType === 'BUY' && stopLossPrice && parseFloat(stopLossPrice) > 0) {
          payload.stop_loss_price = parseFloat(stopLossPrice);
        }
        
        // Add target price for BUY transactions if provided
        if (transactionType === 'BUY' && targetPrice && parseFloat(targetPrice) > 0) {
          payload.target_price = parseFloat(targetPrice);
        }
        
        // Validate: Target price must be greater than stop loss price
        if (transactionType === 'BUY' && payload.stop_loss_price && payload.target_price) {
          if (payload.target_price <= payload.stop_loss_price) {
            setError('Target price must be greater than stop loss price.');
            return;
          }
        }
      }
      
      console.log("Sending transaction payload:", payload);
      mutation.mutate(payload);

    } catch (parseError) {
      console.error('Data parsing error:', parseError);
      setError('Please check your inputs. All numbers must be valid.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !mutation.isPending) {
      handleSubmit(e);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      onKeyPress={handleKeyPress}
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
          inputProps={{ 
            step: "0.01",
            min: "0.01"
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">₹</InputAdornment>
            ),
          }}
          helperText="Decimal amounts allowed"
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
            key={autocompleteKey}
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
                inputProps={{ 
                  step: "1",
                  min: "1"
                }}
                helperText="Whole numbers only"
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
                inputProps={{ 
                  step: "0.01",
                  min: "0.01"
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
          
          {/* Stop Loss Price field - only for BUY transactions */}
          {transactionType === 'BUY' && (
            <TextField
              label="Stop Loss Price (Optional)"
              type="number"
              variant="outlined"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              fullWidth
              inputProps={{ 
                step: "0.01",
                min: "0.01"
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              }}
              helperText="Alert when price falls below this level"
            />
          )}
          
          {/* Target Price field - only for BUY transactions */}
          {transactionType === 'BUY' && (
            <TextField
              label="Target Price (Optional)"
              type="number"
              variant="outlined"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              fullWidth
              inputProps={{ 
                step: "0.01",
                min: "0.01"
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">₹</InputAdornment>
                ),
              }}
              helperText="Alert when price reaches this level"
            />
          )}
          
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