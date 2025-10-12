import { useState } from 'react';
import axios from 'axios';
import { 
    TextField, 
    Button, 
    Typography,
    Paper,
    Alert
} from '@mui/material';

const ClientDepositForm = ({ clientId: propClientId, onTransactionSuccess }) => {
  const [internalClientId, setInternalClientId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clientId = propClientId || internalClientId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || !clientId) {
      alert('Client ID and Amount are required.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/transactions', {
        type: 'DEPOSIT',
        clientId: parseInt(clientId),
        amount: parseFloat(amount),
      });

      setSuccess(response.data.message || 'Deposit successful!');
      setAmount('');
      setInternalClientId('');
      
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to make deposit.');
      console.error('Error making deposit:', err);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <Typography variant="h6" gutterBottom>Log Deposit</Typography>
      
      {!propClientId && (
             <div>
                <TextField
                    fullWidth
                    type="number"
                    value={internalClientId}
                    onChange={(e) => setInternalClientId(e.target.value)}
                    label="Client ID"
                    required
                />
            </div>
        )}
       
      <TextField
        fullWidth
        type="number"
        name="amount"
        value={amount}
        // --- THIS IS THE FIX ---
        // Changed from 'handleChange' to the correct inline function
        onChange={(e) => setAmount(e.target.value)}
        label="Amount (₹)"
        required
      />
      
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

      <Button type="submit" variant="contained" sx={{ mt: 2, py: 1.5 }}>
        Log Deposit
      </Button>
    </Paper>
  );
};

export default ClientDepositForm;

