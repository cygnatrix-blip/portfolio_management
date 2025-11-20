// client/src/components/TickerHistoryModal.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Modal,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Get token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Helper to format currency
const formatCurrency = (value, fractionDigits = 2) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

// This function calls our NEW API endpoint
const fetchTickerTransactions = async (portfolioId, ticker) => {
  if (!portfolioId || !ticker) return [];
  const token = getAuthToken();
  const { data } = await axios.get(
    `/api/transactions/${portfolioId}/ticker/${ticker}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
};

// Modal Style
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 800,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto',
};

const TickerHistoryModal = ({ portfolioId, ticker, open, onClose }) => {
  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tickerTransactions', portfolioId, ticker],
    queryFn: () => fetchTickerTransactions(portfolioId, ticker),
    enabled: !!open && !!ticker, // Only run the query when the modal is open
  });

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        
        <Typography variant="h5" component="h2" gutterBottom>
          Transaction History for: {ticker}
        </Typography>

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error">
            Error loading transactions: {error.message}
          </Alert>
        )}
        {transactions && (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        {new Date(tx.transaction_date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell
                        sx={{
                          color:
                            tx.transaction_type === 'BUY'
                              ? 'success.main'
                              : 'error.main',
                          fontWeight: 'bold',
                        }}
                      >
                        {tx.transaction_type}
                      </TableCell>
                      <TableCell align="right">
                        {parseFloat(tx.quantity).toLocaleString('en-IN', {
                          maximumFractionDigits: 4,
                        })}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(tx.price_per_share)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(tx.total_value)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No transactions found for this ticker.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Modal>
  );
};

export default TickerHistoryModal;