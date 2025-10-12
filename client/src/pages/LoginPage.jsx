import { useState } from 'react';
import { Link } from 'react-router-dom'; // 1. Import the Link component
import axios from 'axios';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Container
} from '@mui/material';


const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });

      const { token } = response.data;

      // We no longer need to save the email, the token has the role
      localStorage.setItem('token', token);

      // Reload the page to trigger the app to recognize the new login state
      window.location.reload();

    } catch (err) {
      setError('Failed to log in. Please check your email and password.');
      console.error('Login error:', err.response ? err.response.data : err.message);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography component="h1" variant="h5">
                Sign In
            </Typography>
            <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {error && (
                    <Typography color="error" align="center" sx={{ mt: 2 }}>
                    {error}
                    </Typography>
                )}
                <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2, py: 1.5 }}
                >
                    Sign In
                </Button>
                <Box textAlign="center">
                    {/* 2. Add a link to the new Register Page */}
                    <Link to="/register" variant="body2">
                    {"Don't have an account? Sign Up"}
                    </Link>
                </Box>
            </Box>
        </Paper>
    </Container>
  );
};

export default LoginPage;

