import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress
} from '@mui/material';
import CreateClientForm from '../components/CreateClientForm';

const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientsData = async () => {
            try {
                const response = await axios.get('http://localhost:5000/api/dashboard');
                setClients(response.data.clients || []);
            } catch (error) {
                console.error('Error fetching clients data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchClientsData();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4, color: '#1a237e' }}>
                Clients
            </Typography>
            <Grid container spacing={4}>
                <Grid xs={12} lg={8}>
                    <Typography variant="h5" gutterBottom component="div" sx={{ color: '#1a237e' }}>Client Holdings</Typography>
                    <TableContainer component={Paper} sx={{ boxShadow: 3, borderRadius: 2 }}>
                        <Table sx={{ minWidth: 650 }}>
                            <TableHead sx={{ backgroundColor: '#1a237e' }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'white' }}>Client ID</TableCell>
                                    <TableCell sx={{ color: 'white' }}>Name (Click to View)</TableCell>
                                    <TableCell sx={{ color: 'white' }} align="right">Total Units</TableCell>
                                    <TableCell sx={{ color: 'white' }} align="right">Current Value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {clients.length > 0 ? clients.map((client) => (
                                    <TableRow key={client.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>{client.id}</TableCell>
                                        <TableCell>
                                            <Link to={`/client/${client.id}`} style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 'bold' }}>
                                                {client.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell align="right">{client.totalUnits.toFixed(4)}</TableCell>
                                        <TableCell align="right">
                                            ₹{client.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">No clients found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
                <Grid xs={12} lg={4}>
                    <Typography variant="h5" gutterBottom component="div" sx={{ color: '#1a237e' }}>Create New Client</Typography>
                    <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
                        <CreateClientForm onClientCreated={() => window.location.reload()} />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ClientsPage;