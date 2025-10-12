import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    Box, Typography, Paper, Grid, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Card, CardContent
} from '@mui/material';
import ClientDepositForm from '../components/ClientDepositForm';
import ClientWithdrawalForm from '../components/ClientWithdrawalForm';

const ClientDetailPage = () => {
    const { clientId } = useParams();
    const [clientDetails, setClientDetails] = useState(null);
    const [transactionHistory, setTransactionHistory] = useState([]);
    const [latestNAV, setLatestNAV] = useState(10); // Default to 10
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClientData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // Fetch both client data and the latest NAV in parallel
                const [clientRes, navRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/clients/${clientId}`, config),
                    axios.get(`http://localhost:5000/api/dashboard`, config) // Use dashboard to get NAV
                ]);

                setClientDetails(clientRes.data.details);
                setTransactionHistory(clientRes.data.history);
                if (navRes.data && navRes.data.latestNav) {
                    setLatestNAV(parseFloat(navRes.data.latestNav.nav_value));
                }

            } catch (err) {
                setError('Failed to fetch client data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClientData();
    }, [clientId]);

    const performance = useMemo(() => {
        if (!transactionHistory || transactionHistory.length === 0) {
            return { totalUnits: 0, currentValue: 0, absoluteReturn: '0.00' };
        }

        let netInvestment = 0;
        let totalUnits = 0;
        transactionHistory.forEach(tx => {
            if (tx.transaction_type.toUpperCase() === 'DEPOSIT') {
                netInvestment += parseFloat(tx.amount);
                totalUnits += parseFloat(tx.units);
            } else if (tx.transaction_type.toUpperCase() === 'WITHDRAWAL') {
                netInvestment -= parseFloat(tx.amount);
                totalUnits -= parseFloat(tx.units);
            }
        });

        const currentValue = totalUnits * latestNAV;
        let absoluteReturn = "0.00";
        if (netInvestment > 0) {
            absoluteReturn = (((currentValue - netInvestment) / netInvestment) * 100).toFixed(2);
        }

        return { totalUnits, currentValue, absoluteReturn };
    }, [transactionHistory, latestNAV]);


    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (error || !clientDetails) {
        return <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>{error || 'No data available for this client.'}</Typography>;
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ color: '#004d40' }}>
                Client Details: {clientDetails.name}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card><CardContent>
                        <Typography color="textSecondary">Total Units</Typography>
                        <Typography variant="h5">{performance.totalUnits.toFixed(4)}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card><CardContent>
                        <Typography color="textSecondary">Current Value</Typography>
                        <Typography variant="h5">₹{performance.currentValue.toLocaleString('en-IN')}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card><CardContent>
                        <Typography color="textSecondary">Absolute Return</Typography>
                        <Typography variant="h5">{performance.absoluteReturn}%</Typography>
                    </CardContent></Card>
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: '#004d40' }}>Log Deposit</Typography>
                        <ClientDepositForm clientId={clientId} onTransactionSuccess={() => window.location.reload()} />
                    </Paper>
                </Grid>
                <Grid item xs={12} lg={6}>
                    <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom sx={{ color: '#004d40' }}>Log Withdrawal</Typography>
                        <ClientWithdrawalForm clientId={clientId} onTransactionSuccess={() => window.location.reload()} />
                    </Paper>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: '#004d40' }}>
                    Transaction History
                </Typography>
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead sx={{ backgroundColor: '#00695c' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'white' }}>Date</TableCell>
                                <TableCell sx={{ color: 'white' }}>Type</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">Amount</TableCell>
                                <TableCell sx={{ color: 'white' }} align="right">Units</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {transactionHistory.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{new Date(tx.transaction_date).toLocaleDateString('en-IN')}</TableCell>
                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                            fontWeight: 'bold',
                                            color: tx.transaction_type.toUpperCase() === 'DEPOSIT' ? 'success.main' : 'error.main',
                                            }}
                                        >
                                            {tx.transaction_type}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">₹{parseFloat(tx.amount).toLocaleString('en-IN')}</TableCell>
                                    <TableCell align="right">{parseFloat(tx.units).toFixed(4)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default ClientDetailPage;