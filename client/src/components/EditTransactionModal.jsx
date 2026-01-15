// client/src/components/EditTransactionModal.jsx
import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Modal, Box, Typography, TextField, Button, CircularProgress, Alert, InputAdornment
} from '@mui/material';

const modalStyle = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
  width: 400, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 24, p: 4,
  display: 'flex', flexDirection: 'column', gap: 2,
};

const getAuthToken = () => localStorage.getItem('token');

const EditTransactionModal = ({ open, onClose, transaction, type }) => {
  // type is 'ASSET' (Buy/Sell) or 'LEDGER' (Deposit/Withdrawal)
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (transaction) {
      if (type === 'LEDGER') {
        setAmount(transaction.amount);
      } else {
        setQuantity(transaction.quantity);
        setPrice(transaction.price_per_share);
        setStopLossPrice(transaction.stop_loss_price || '');
        setTargetPrice(transaction.target_price || '');
      }
    }
  }, [transaction, type]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const token = getAuthToken();
      const endpoint = type === 'LEDGER' 
        ? `/api/transactions/ledger/${transaction.id}`
        : `/api/transactions/asset/${transaction.id}`;
      
      await axios.put(endpoint, data, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || 'Update failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (type === 'LEDGER') {
      if (parseFloat(amount) <= 0) return setError('Amount must be positive');
      updateMutation.mutate({ amount });
    } else {
      if (parseFloat(quantity) <= 0 || parseFloat(price) <= 0) return setError('Values must be positive');
      const updateData = { quantity, price_per_share: price };
      // Include stop loss if provided
      if (stopLossPrice !== '') {
        updateData.stop_loss_price = parseFloat(stopLossPrice) || null;
      }
      // Include target price if provided
      if (targetPrice !== '') {
        updateData.target_price = parseFloat(targetPrice) || null;
      }
      
      // Validate: Target price must be greater than stop loss price (only for BUY transactions)
      if (transaction.transaction_type === 'BUY' && updateData.stop_loss_price && updateData.target_price) {
        if (updateData.target_price <= updateData.stop_loss_price) {
          return setError('Target price must be greater than stop loss price.');
        }
      }
      
      updateMutation.mutate(updateData);
    }
  };

  if (!transaction) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box component="form" sx={modalStyle} onSubmit={handleSubmit}>
        <Typography variant="h6">Edit Transaction</Typography>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            {transaction.transaction_type} {type === 'ASSET' ? `- ${transaction.ticker}` : ''} 
             <br/>Date: {new Date(transaction.transaction_date).toLocaleDateString()}
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        {type === 'LEDGER' ? (
          <TextField
            label="Amount" type="number" fullWidth required
            value={amount} onChange={(e) => setAmount(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
          />
        ) : (
          <>
            <TextField
              label="Quantity" type="number" fullWidth required
              value={quantity} onChange={(e) => setQuantity(e.target.value)}
            />
            <TextField
              label="Price per Share" type="number" fullWidth required
              value={price} onChange={(e) => setPrice(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
            {/* Stop Loss field for BUY transactions */}
            {transaction.transaction_type === 'BUY' && (
              <TextField
                label="Stop Loss Price (Optional)" 
                type="number" 
                fullWidth
                value={stopLossPrice} 
                onChange={(e) => setStopLossPrice(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                helperText="Alert when price falls below this level"
              />
            )}
            {/* Target Price field for BUY transactions */}
            {transaction.transaction_type === 'BUY' && (
              <TextField
                label="Target Price (Optional)" 
                type="number" 
                fullWidth
                value={targetPrice} 
                onChange={(e) => setTargetPrice(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                helperText="Alert when price reaches this level"
              />
            )}
          </>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={onClose} disabled={updateMutation.isPending}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <CircularProgress size={20} /> : 'Save Changes'}
            </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default EditTransactionModal;