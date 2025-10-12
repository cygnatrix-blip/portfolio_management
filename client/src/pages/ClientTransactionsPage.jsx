import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';

const ClientTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        setError("Authentication token not found.");
        return;
      }
      const config = { headers: { Authorization: `Bearer ${token}` } };

      try {
        const response = await axios.get('http://localhost:5000/api/portal/me', config);
        // Sort transactions by date descending
        const sortedTransactions = (response.data.transactionHistory || []).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
        setTransactions(sortedTransactions);
      } catch (err) {
        console.error('Error fetching transaction data:', err);
        setError('Failed to load transaction history.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: 'center' }}>
        {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4, color: '#004d40' }}>
        Your Transaction History
      </Typography>
      <Paper sx={{ boxShadow: 3, borderRadius: 2 }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ backgroundColor: '#00695c' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}>Date</TableCell>
                <TableCell sx={{ color: 'white' }}>Type</TableCell>
                <TableCell sx={{ color: 'white' }} align="right">Amount</TableCell>
                <TableCell sx={{ color: 'white' }} align="right">Units</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx, index) => (
                  <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                      {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      {/* --- THIS IS THE CHANGE --- */}
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ClientTransactionsPage;