import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Container,
    CssBaseline,
    InputAdornment,
    Alert,
    Checkbox,
    FormControlLabel,
    Grid
} from '@mui/material';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

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
            localStorage.setItem('token', token);
            window.location.reload();

        } catch (err) {
            setError('Login failed. Please check your credentials.');
            console.error('Login error:', err.response ? err.response.data : err.message);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(to top right, #e8f5e9, #b2dfdb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <CssBaseline />
            <Container component="main" maxWidth="xs">
                <Paper
                    elevation={6}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: '16px',
                    }}
                >
                    <Box sx={{ color: '#004d40', mb: 2 }}>
                        <TrendingUpIcon sx={{ fontSize: 40 }} />
                    </Box>
                    <Typography component="h1" variant="h5" sx={{ fontWeight: 'bold' }}>
                        Welcome Back!
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        Sign in to continue
                    </Typography>
                    
                    <Box component="form" noValidate onSubmit={handleLogin} sx={{ width: '100%' }}>
                        <TextField
                            variant="outlined"
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
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailOutlinedIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            variant="outlined"
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
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockOutlinedIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        
                        <Grid container alignItems="center" justifyContent="space-between">
                            <Grid item>
                                <FormControlLabel
                                    control={<Checkbox value="remember" color="primary" />}
                                    label="Remember me"
                                />
                            </Grid>
                            <Grid item>
                                <Link to="#" variant="body2" style={{ color: '#00695c', textDecoration: 'none' }}>
                                    Forgot password?
                                </Link>
                            </Grid>
                        </Grid>

                        {error && (
                            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                                {error}
                            </Alert>
                        )}
                        
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{
                                mt: 2,
                                mb: 2,
                                py: 1.5,
                                fontSize: '1rem',
                                backgroundColor: '#004d40',
                                '&:hover': {
                                    backgroundColor: '#00695c',
                                }
                            }}
                        >
                            Sign In
                        </Button>
                        <Typography variant="body2" align="center">
                            Don't have an account?{' '}
                            <Link to="/register" style={{ color: '#00695c', fontWeight: 'bold', textDecoration: 'none' }}>
                                Sign Up
                            </Link>
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default LoginPage;

