import { useState } from 'react';
import axios from 'axios';
import { 
    Box, 
    TextField, 
    Button, 
    Typography,
    Paper
} from '@mui/material';

const ManualNavForm = () => {
  const [totalValue, setTotalValue] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!totalValue) {
      alert('Please enter the total portfolio value.');
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/api/portfolio/nav', {
        total_portfolio_value: parseFloat(totalValue),
      });
      const newNav = parseFloat(response.data.nav_value).toFixed(4);
      alert(`NAV updated successfully! New NAV is ₹${newNav}`);
      setTotalValue('');
      // Optionally, trigger a refresh of the dashboard
      window.location.reload();
    } catch (error) {
      console.error('Error updating NAV:', error);
      alert('Failed to update NAV.');
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" gutterBottom>EOD NAV Update</Typography>
        <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
            Enter the total market value of all holdings at the end of the day.
        </Typography>
        <TextField
            fullWidth
            type="number"
            name="total_portfolio_value"
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
            label="Total Portfolio Value (₹)"
            variant="outlined"
            required
            InputProps={{
              inputProps: { 
                step: "0.01" // Allows decimal values
              }
            }}
        />
        <Button type="submit" variant="contained" color="secondary" sx={{ mt: 2, py: 1.5 }}>
            Update Today's NAV
        </Button>
    </Paper>
  );
};

export default ManualNavForm;
