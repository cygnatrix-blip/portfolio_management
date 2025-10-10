import { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import ClientDepositForm from '../components/ClientDepositForm';
import ClientWithdrawalForm from '../components/ClientWithdrawalForm';
import ResetPasswordForm from '../components/ResetPasswordForm'; // 1. Import the new form

import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    Link,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ClientDetailPage = () => {
  const { clientId } = useParams(); 
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchClientDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/clients/${clientId}`);
      setClientData(response.data);
    } catch (error) {
      console.error("Error fetching client details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
        </Box>
    );
  }

  if (!clientData) {
    return <Typography variant="h6" color="text.secondary" sx={{mt: 4}}>Could not find data for this client.</Typography>;
  }

  const { details, history } = clientData;

  return (
    <Box sx={{ flexGrow: 1, padding: '16px' }}>
      <Link component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ArrowBackIcon sx={{ mr: 1 }} />
        Back to Dashboard
      </Link>
      <Typography variant="h4" gutterBottom>{details.name}'s Details</Typography>
      
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography><strong>Email:</strong> {details.email}</Typography>
        <Typography><strong>Client ID:</strong> {details.id}</Typography>
      </Paper>
      
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>Manage Transactions</Typography>
            <ClientDepositForm clientId={details.id} onTransactionSuccess={fetchClientDetails} />
            <ClientWithdrawalForm clientId={details.id} onTransactionSuccess={fetchClientDetails} />
        </Grid>
        <Grid item xs={12} md={6}>
            <Typography variant="h5" gutterBottom>Security</Typography>
            {/* 2. Add the new Reset Password form here, passing the client's ID */}
            <ResetPasswordForm clientId={details.id} />
        </Grid>
      </Grid> 

      <Box sx={{ mt: 5 }}>
        <Typography variant="h5" gutterBottom>Transaction History</Typography>
        <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell align="right">Units</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {history.map((tx) => (
                    <TableRow key={tx.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell>{new Date(tx.transaction_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell>{tx.transaction_type}</TableCell>
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

