import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Pagination,
    Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const AssetTransactionsPage = () => {
    const [page, setPage] = useState(1);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['assetTransactions', page],
        queryFn: async () => {
            const response = await axios.get(`http://localhost:5000/api/transactions/assets?page=${page}&limit=25`);
            return response.data;
        },
        keepPreviousData: true,
    });

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    if (isLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    if (isError) {
        return <Typography color="error" sx={{ my: 4 }}>Error loading transactions.</Typography>;
    }

    return (
        <Box sx={{ flexGrow: 1, padding: { xs: 1, md: 2 } }}>
            <Link component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ArrowBackIcon sx={{ mr: 1 }} />
                Back to Dashboard
            </Link>
            <Typography variant="h4" gutterBottom>
                All Asset Transactions
            </Typography>
            <TableContainer component={Paper}>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell>Date & Time</TableCell> {/* <-- Title changed */}
                            <TableCell>Type</TableCell>
                            <TableCell>Ticker</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell align="right">Price per Share</TableCell>
                            <TableCell align="right">Total Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data?.transactions.map((tx) => (
                            <TableRow key={tx.id}>
                                {/* --- THIS IS THE CHANGE --- */}
                                <TableCell>
                                    {new Date(tx.transaction_date).toLocaleString('en-IN', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                        hour: 'numeric', minute: '2-digit', hour12: true
                                    })}
                                </TableCell>
                                <TableCell>
                                    <Typography sx={{ color: tx.transaction_type === 'BUY' ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                                        {tx.transaction_type}
                                    </Typography>
                                </TableCell>
                                <TableCell>{tx.ticker}</TableCell>
                                <TableCell align="right">{parseFloat(tx.quantity).toFixed(4)}</TableCell>
                                <TableCell align="right">₹{parseFloat(tx.price_per_share).toLocaleString('en-IN')}</TableCell>
                                <TableCell align="right">₹{parseFloat(tx.total_value).toLocaleString('en-IN')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <Pagination
                    count={data?.totalPages || 0}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                />
            </Box>
        </Box>
    );
};

export default AssetTransactionsPage;