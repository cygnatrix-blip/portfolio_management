import { useState } from 'react';
import axios from 'axios';
import { 
    TextField, 
    Button, 
    Typography,
    Paper,
    Box
} from '@mui/material';

const CreateClientForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // 1. Add state for the password
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 2. Get the admin's token from localStorage to prove they are authorized
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
      // 3. Send the request to the new, secure admin endpoint
      await axios.post('http://localhost:5000/api/admin/users', { name, email, password }, config);
      
      setSuccess(`Client "${name}" created successfully!`);
      setName('');
      setEmail('');
      setPassword('');
      // Refresh the main dashboard to show the new client in the list
      setTimeout(() => window.location.reload(), 2000); 

    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to create client.');
      console.error('Error creating client:', err);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: { xs: 2, md: 0 } }}>
      <Typography variant="h6" gutterBottom>Create New Client</Typography>
      
      <TextField
        fullWidth
        type="text"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        label="Client Name"
        variant="outlined"
        required
      />
      
      <TextField
        fullWidth
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        label="Client Email"
        variant="outlined"
        required
      />

      {/* 4. Add the new password input field */}
      <TextField
        fullWidth
        type="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        label="Set Initial Password"
        variant="outlined"
        required
      />
      
      {success && <Typography color="success.main" sx={{ mt: 1 }}>{success}</Typography>}
      {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
      
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2, py: 1.5 }}>
        Create Client
      </Button>
    </Paper>
  );
};

export default CreateClientForm;

