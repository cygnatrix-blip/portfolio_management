import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

import { 
    Box, 
    Card, 
    CardContent, 
    Typography, 
    Grid, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper,
    CircularProgress,
    Button
} from '@mui/material';

const AdminDashboard = () => {
    // --- Your original state hooks ---
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    // --- Your original useEffect hook ---
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // This single endpoint now returns all the data we need
                const response = await axios.get('http://localhost:5000/api/dashboard');
                setDashboardData(response.data);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const getNavChartData = () => {
        if (!dashboardData || !dashboardData.navHistory) return [];
        return dashboardData.navHistory.map(historyPoint => ({
            date: new Date(historyPoint.nav_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
            nav: parseFloat(historyPoint.nav_value)
        }));
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!dashboardData || !dashboardData.latestNav) {
        return <Typography variant="h6" color="text.secondary" sx={{mt: 4}}>No portfolio data found. Please log a client deposit to begin.</Typography>;
    }

    const { latestNav, clients, holdings, assetTransactions } = dashboardData;
    const navChartData = getNavChartData();

    const MetricCard = ({ title, value, formatAsCurrency = false }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography color="text.secondary" gutterBottom>{title}</Typography>
                <Typography variant="h5" component="div">
                    {formatAsCurrency ? `₹${parseFloat(value).toLocaleString('en-IN')}` : parseFloat(value).toFixed(4)}
                </Typography>
            </CardContent>
        </Card>
    );

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
    
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent < 0.05) return null;
        return (
            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };
    
    const totalPortfolioValue = parseFloat(latestNav.total_portfolio_value);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" gutterBottom component="div">
                Admin Dashboard
            </Typography>

            {/* --- CORRECTED GRID SYNTAX --- */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}><MetricCard title="Current NAV" value={latestNav.nav_value} /></Grid>
                <Grid item xs={12} sm={4}><MetricCard title="Total Portfolio Value" value={latestNav.total_portfolio_value} formatAsCurrency /></Grid>
                <Grid item xs={12} sm={4}><MetricCard title="Total Units" value={latestNav.total_units_outstanding} /></Grid>
            </Grid>
            
            <Paper sx={{ p: { xs: 1, md: 3 }, mb: 4 }}>
                <Typography variant="h5" gutterBottom>Fund Performance (NAV History)</Typography>
                <Box sx={{ height: 400 }}>
                    {navChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={navChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis width={80} tickFormatter={(value) => `₹${value.toFixed(2)}`} domain={['dataMin - 1', 'dataMax + 1']} />
                                <Tooltip formatter={(value) => `₹${value.toFixed(4)}`} />
                                <Legend />
                                <Line type="monotone" dataKey="nav" stroke="#00C4F9" strokeWidth={2} name="NAV" activeDot={{ r: 8 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    ) : ( <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}><Typography color="text.secondary">NAV history will be displayed here.</Typography></Box> )}
                </Box>
            </Paper>

            {/* --- CORRECTED GRID SYNTAX --- */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
                <Grid item xs={12} lg={8}>
                    <Typography variant="h5" gutterBottom component="div">Client Holdings</Typography>
                    <TableContainer component={Paper}>
                        <Table sx={{ minWidth: 650 }}>
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}><TableRow><TableCell>Client ID</TableCell><TableCell>Name (Click to View)</TableCell><TableCell align="right">Total Units</TableCell><TableCell align="right">Current Value</TableCell></TableRow></TableHead>
                            <TableBody>
                                {clients.map((client) => (
                                <TableRow key={client.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{client.id}</TableCell>
                                    <TableCell><Link to={`/client/${client.id}`} style={{ textDecoration: 'none', color: '#1976d2', fontWeight: 'bold' }}>{client.name}</Link></TableCell>
                                    <TableCell align="right">{client.totalUnits.toFixed(4)}</TableCell>
                                    <TableCell align="right">₹{client.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
                
                <Grid item xs={12} lg={4}>
                    <Typography variant="h5" gutterBottom component="div">Portfolio Allocation</Typography>
                    <Paper sx={{ height: 400, p: 2, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ width: '100%', height: '65%', mb: 2 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={holdings} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius="85%" innerRadius="60%" dataKey="value" paddingAngle={2} >
                                        {holdings.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Box>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>
                            {holdings.map((entry, index) => (
                                <Box key={`item-${index}`} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                    <Box sx={{ width: 14, height: 14, backgroundColor: COLORS[index % COLORS.length], mr: 1.5, flexShrink: 0 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '10px' }}>
                                        <Typography variant="body2" noWrap title={entry.name}>{entry.name}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold', flexShrink: 0 }}>{`₹${entry.value.toLocaleString('en-IN')}`}</Typography>
                                    </Box>
                                </Box>
                            ))}
                            <hr style={{width: '100%', borderTop: '1px solid #eee', margin: '8px 0'}} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mt: 1}}>
                                <Typography variant="body1" sx={{fontWeight: 'bold'}}>Total</Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{`₹${totalPortfolioValue.toLocaleString('en-IN')}`}</Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>

            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4 }}>
                    <Typography variant="h5" gutterBottom component="div">
                        Asset Transaction History (Recent)
                    </Typography>
                    <Button component={Link} to="/transactions" variant="outlined" size="small">
                        See All Transactions
                    </Button>
                </Box>
                <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>Date</TableCell><TableCell>Type</TableCell><TableCell>Ticker</TableCell><TableCell align="right">Quantity</TableCell><TableCell align="right">Price per Share</TableCell><TableCell align="right">Total Value</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(assetTransactions && assetTransactions.length > 0) ? assetTransactions.map((tx) => (
                                <TableRow key={tx.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{new Date(tx.transaction_date).toLocaleDateString('en-IN')}</TableCell>
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
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">No asset transactions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Box>
    );
};

export default AdminDashboard;