// client/src/components/AssetTransactionsTable.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Box, Typography, CircularProgress, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, Alert, IconButton, Tooltip
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import EditTransactionModal from './EditTransactionModal';

const getAuthToken = () => localStorage.getItem('token');

const formatCurrency = (value, fractionDigits = 2) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`;

const fetchTransactions = async (portfolioId, page = 1, limit = 10) => {
  const token = getAuthToken();
  const { data } = await axios.get(
    `/api/transactions/${portfolioId}?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

const AssetTransactionsTable = ({ portfolioId }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTx, setSelectedTx] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['assetTransactions', portfolioId, page + 1, rowsPerPage],
    queryFn: () => fetchTransactions(portfolioId, page + 1, rowsPerPage),
    keepPreviousData: true,
  });

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (isLoading && !data) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">Error loading transactions</Alert>;

  const transactions = data?.transactions || [];
  const totalItems = data?.totalItems || 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Asset Transaction History (Buy/Sell)</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Ticker</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Total Value</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.transaction_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell sx={{ color: tx.transaction_type === 'BUY' ? 'success.main' : 'error.main', fontWeight: 'bold' }}>{tx.transaction_type}</TableCell>
                  <TableCell>{tx.ticker}</TableCell>
                  <TableCell align="right">{parseFloat(tx.quantity).toLocaleString('en-IN')}</TableCell>
                  <TableCell align="right">{formatCurrency(tx.price_per_share)}</TableCell>
                  <TableCell align="right">{formatCurrency(tx.total_value)}</TableCell>
                  <TableCell align="right">
                     <Tooltip title="Edit Transaction">
                        <IconButton size="small" onClick={() => setSelectedTx(tx)}>
                            <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={7} align="center">No asset transactions found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalItems} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />
      
      <EditTransactionModal 
        open={!!selectedTx} 
        onClose={() => setSelectedTx(null)} 
        transaction={selectedTx} 
        type="ASSET" 
      />
    </Box>
  );
};

export default AssetTransactionsTable;