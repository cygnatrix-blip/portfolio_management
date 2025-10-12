import { useState } from 'react';
import axios from 'axios';
import { 
    TextField, 
    Button, 
    Typography,
    Paper
} from '@mui/material';

// This component receives the clientId as a prop from the ClientDetailPage
const ResetPasswordForm = ({ clientId }) => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
    }

    // Get the admin's token to prove they are authorized to make this change
    const token = localStorage.getItem('token');
    if (!token) {
        setError("Admin not authenticated. Please log in again.");
        return;
    }

    const config = {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    };

    try {
      // Send the request to the secure admin endpoint to reset the password
      const response = await axios.put(
        'http://localhost:5000/api/admin/users/reset-password', 
        { clientId, newPassword }, 
        config
      );
      
      setSuccess(response.data.msg || 'Password reset successfully!');
      setNewPassword('');
    
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to reset password.');
      console.error('Error resetting password:', err);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Reset Client Password</Typography>
      
      <TextField
        fullWidth
        type="password"
        name="newPassword"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        label="Enter New Password"
        variant="outlined"
        required
      />
      
      {success && <Typography color="success.main" sx={{ mt: 1 }}>{success}</Typography>}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      
      <Button type="submit" variant="contained" color="warning" sx={{ mt: 2, py: 1.5 }}>
        Reset Password
      </Button>
    </Paper>
  );
};

export default ResetPasswordForm;

