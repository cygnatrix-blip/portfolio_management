import { useState } from 'react';
import axios from 'axios';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Button,
    Typography,
    Paper,
    Alert
} from '@mui/material';

const UnifiedTransactionForm = () => {
  const [type, setType] = useState('DEPOSIT');
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    ticker: '',
    quantity: '',
    price: '', // <-- New field for the transaction price
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { clientId, amount, ticker, quantity, price } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // When the transaction type changes, reset the form data
  const handleTypeChange = (e) => {
    setType(e.target.value);
    setFormData({ clientId: '', amount: '', ticker: '', quantity: '', price: ''});
    setError('');
    setSuccess('');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const payload = { type, ...formData };

    try {
      const response = await axios.post('http://localhost:5000/api/transactions', payload);
      setSuccess(response.data.message || 'Transaction successful!');
      // Optionally, clear form after success
      setFormData({ clientId: '', amount: '', ticker: '', quantity: '', price: ''});
      
      // We can reload to see changes, or ideally, have a global state update
      setTimeout(() => window.location.reload(), 1500);

    } catch (err) {
      // The new backend sends a user-friendly message
      setError(err.response?.data?.message || 'An error occurred.');
      console.error('Transaction failed:', err);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6" gutterBottom>New Transaction</Typography>
      
      <FormControl fullWidth>
        <InputLabel id="transaction-type-label">Transaction Type</InputLabel>
        <Select
          labelId="transaction-type-label"
          value={type}
          label="Transaction Type"
          onChange={handleTypeChange}
        >
          <MenuItem value="DEPOSIT">Deposit</MenuItem>
          <MenuItem value="WITHDRAWAL">Withdrawal</MenuItem>
          <MenuItem value="BUY">Buy Asset</MenuItem>
          <MenuItem value="SELL">Sell Asset</MenuItem>
        </Select>
      </FormControl>

      {(type === 'DEPOSIT' || type === 'WITHDRAWAL') && (
        <>
          <TextField fullWidth type="number" name="clientId" value={clientId} onChange={handleChange} label="Client ID" required />
          <TextField fullWidth type="number" name="amount" value={amount} onChange={handleChange} label="Amount (₹)" required />
        </>
      )}

      {(type === 'BUY' || type === 'SELL') && (
        <>
          <TextField fullWidth type="text" name="ticker" value={ticker} onChange={handleChange} label="Ticker Symbol" required />
          <TextField fullWidth type="number" name="quantity" value={quantity} onChange={handleChange} label="Quantity (Shares)" required />
          <TextField fullWidth type="number" name="price" value={price} onChange={handleChange} label="Price per Share (₹)" required InputProps={{ inputProps: { step: "0.01" } }}/>
        </>
      )}
      
      {/* Display Success or Error Messages */}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2, py: 1.5 }}>
        Process Transaction
      </Button>
    </Paper>
  );
};

export default UnifiedTransactionForm;

