import { useState } from 'react';
import axios from 'axios';
import { 
    TextField, 
    Button, 
    Typography,
    Paper,
    Alert
} from '@mui/material';

const ClientWithdrawalForm = ({ clientId: propClientId, onTransactionSuccess }) => {
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
            alert('Client ID and Withdrawal Amount are required.');
            return;
        }
        try {
            // --- THIS IS THE FIX ---
            // We now call the unified '/api/transactions' endpoint
            const response = await axios.post('http://localhost:5000/api/transactions', {
                type: 'WITHDRAWAL', // We explicitly tell the API what we're doing
                clientId: parseInt(clientId),
                amount: parseFloat(amount),
            });

            setSuccess(response.data.message || 'Withdrawal successful!');
            setAmount('');
            setInternalClientId('');

            if (onTransactionSuccess) {
                onTransactionSuccess();
            }

        } catch (err) {
            setError(err.response?.data?.message || 'Failed to process withdrawal.');
            console.error('Error processing withdrawal:', err);
        }
    };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <Typography variant="h6" gutterBottom>Log Withdrawal</Typography>
      
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
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        label="Withdrawal Amount (₹)"
        required
      />

      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      <Button type="submit" variant="contained" color="warning" sx={{ mt: 2, py: 1.5 }}>
          Log Withdrawal
      </Button>
    </Paper>
  );
};

export default ClientWithdrawalForm;

