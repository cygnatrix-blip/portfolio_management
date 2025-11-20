// client/src/components/ClientTransactionsTable.jsx
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
const formatCurrency = (value) => `₹${parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fetchLedgerTransactions = async (portfolioId, page = 1, limit = 10) => {
  const token = getAuthToken();
  const { data } = await axios.get(`/api/transactions/ledger/${portfolioId}?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const ClientTransactionsTable = ({ portfolioId }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedTx, setSelectedTx] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['clientTransactions', portfolioId, page + 1, rowsPerPage],
    queryFn: () => fetchLedgerTransactions(portfolioId, page + 1, rowsPerPage),
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
      <Typography variant="h6" gutterBottom>Fund Transaction History (Deposit/Withdrawal)</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Units</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.transaction_date).toLocaleDateString('en-GB')}</TableCell>
                  <TableCell sx={{ color: tx.transaction_type === 'DEPOSIT' ? 'success.main' : 'error.main', fontWeight: 'bold' }}>{tx.transaction_type}</TableCell>
                  <TableCell align="right">{formatCurrency(tx.amount)}</TableCell>
                  <TableCell align="right">{parseFloat(tx.units).toFixed(4)}</TableCell>
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
              <TableRow><TableCell colSpan={5} align="center">No fund transactions found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={totalItems} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} />
      
      <EditTransactionModal 
        open={!!selectedTx} 
        onClose={() => setSelectedTx(null)} 
        transaction={selectedTx} 
        type="LEDGER" 
      />
    </Box>
  );
};

export default ClientTransactionsTable;