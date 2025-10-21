import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    Box,
    Typography,
    Paper,
    Grid,
    CircularProgress,
    Card,
    CardContent,
    Button,
    ToggleButtonGroup,
    ToggleButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';

// Helper function to format a date to YYYY-MM-DD for reliable matching
const formatDateKey = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
}

const ClientDashboard = () => {
    const [clientData, setClientData] = useState(null);
    const [nifty50Data, setNifty50Data] = useState([]);
    const [nifty500Data, setNifty500Data] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshCount, setRefreshCount] = useState(0);
    const [timePeriod, setTimePeriod] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState('nifty50'); // 'nifty50' or 'nifty500'

    const handleTimePeriodChange = (event, newPeriod) => {
        setTimePeriod(newPeriod);
    };

    const handleIndexChange = (event) => {
        setSelectedIndex(event.target.value);
    };
    
    const fetchAllData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        const config = { 
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        };

        try {
            const [clientRes, dashboardRes] = await Promise.all([
                axios.get('http://localhost:5000/api/portal/me', config),
                axios.get('http://localhost:5000/api/dashboard', config)
            ]);
            
            setClientData(clientRes.data);
            setNifty50Data(dashboardRes.data.niftyHistory || []);
            
            // Fetch Nifty 500 data - you'll need to implement this endpoint
            // For now, I'll assume it's available in the dashboard response
            // If not, you'll need to make a separate API call
            setNifty500Data(dashboardRes.data.nifty500History || []); 
            setError(null);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError(`Failed to load data: ${error.response?.data?.message || error.message}`);
            if (error.response && error.response.status === 401) {
                localStorage.removeItem('token');
                window.location.reload();
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, refreshCount]);

    const handleRefresh = () => {
        setLoading(true);
        setRefreshCount(prev => prev + 1);
    };
    
    const filterDataByTimePeriod = (data, dateKey) => {
        if (!timePeriod) return data;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - timePeriod);
        return data.filter(item => new Date(item[dateKey]) >= cutoffDate);
    };

    // Get the selected index data based on user choice
    const getSelectedIndexData = () => {
        return selectedIndex === 'nifty50' ? nifty50Data : nifty500Data;
    };

    // Get the display name for the selected index
    const getSelectedIndexName = () => {
        return selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';
    };

    const normalizedData = useMemo(() => {
        const selectedIndexData = getSelectedIndexData();
        
        if (!clientData || !clientData.navHistory || clientData.navHistory.length < 2 || !selectedIndexData || selectedIndexData.length === 0) {
            return [];
        }

        const filteredNavHistory = filterDataByTimePeriod(clientData.navHistory, 'nav_date');
        const filteredIndexData = filterDataByTimePeriod(selectedIndexData, 'date');

        if (filteredNavHistory.length < 2 || filteredIndexData.length < 2) {
             return [];
        }
        
        try {
            const indexMap = new Map();
            filteredIndexData.forEach(item => {
                const date = item.date;
                if (date) {
                    const dateKey = formatDateKey(date);
                    indexMap.set(dateKey, parseFloat(item.price));
                }
            });
            
            const matchingData = filteredNavHistory
                .map(navPoint => {
                    const dateKey = formatDateKey(navPoint.nav_date);
                    const indexPrice = indexMap.get(dateKey);
                    
                    if (indexPrice && !isNaN(indexPrice)) {
                        return { 
                            navDate: navPoint.nav_date, 
                            navValue: parseFloat(navPoint.nav_value), 
                            indexPrice, 
                            dateKey 
                        };
                    }
                    return null;
                })
                .filter(Boolean)
                .sort((a, b) => new Date(a.navDate) - new Date(b.navDate));

            if (matchingData.length < 2) return [];

            const baseNav = matchingData[0].navValue;
            const baseIndex = matchingData[0].indexPrice;

            return matchingData.map((point) => ({
                date: new Date(point.navDate).toLocaleDateString('en-IN', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: '2-digit' 
                }),
                fundPerformance: ((point.navValue / baseNav) - 1) * 100,
                indexPerformance: ((point.indexPrice / baseIndex) - 1) * 100,
                raw: { 
                    nav: point.navValue, 
                    index: point.indexPrice, 
                    date: point.dateKey,
                    baseNav,
                    baseIndex
                }
            }));
            
        } catch (error) {
            console.error('💥 Error calculating normalized data:', error);
            return [];
        }
    }, [clientData, nifty50Data, nifty500Data, selectedIndex, timePeriod]);
    
    const getCombinedChartData = () => {
        if (!clientData || !clientData.navHistory || !clientData.transactionHistory) return [];

        const filteredNavHistory = filterDataByTimePeriod(clientData.navHistory, 'nav_date');
        const portfolioDataMap = new Map();
        
        filteredNavHistory.forEach(historyPoint => {
            const transactionsUpToDate = clientData.transactionHistory.filter(tx => new Date(tx.transaction_date) <= new Date(historyPoint.nav_date));
            let unitsHeld = 0;
            let netInvestment = 0;
            transactionsUpToDate.forEach(tx => {
                if(tx.transaction_type === 'DEPOSIT') {
                    unitsHeld += parseFloat(tx.units);
                    netInvestment += parseFloat(tx.amount);
                }
                if(tx.transaction_type === 'WITHDRAWAL') {
                    unitsHeld -= parseFloat(tx.units);
                    netInvestment -= parseFloat(tx.amount);
                }
            });
            const dateStr = new Date(historyPoint.nav_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            const portfolioValue = unitsHeld * parseFloat(historyPoint.nav_value);
            if (portfolioValue > 0.0001) portfolioDataMap.set(dateStr, { date: dateStr, portfolioValue, netInvestment });
        });
        
        return Array.from(portfolioDataMap.values());
    };

    const calculateAbsoluteReturn = () => {
        if (!clientData || !clientData.transactionHistory || clientData.transactionHistory.length === 0) return "N/A";
        let netInvestment = 0;
        clientData.transactionHistory.forEach(tx => {
            if(tx.transaction_type === 'DEPOSIT') netInvestment += parseFloat(tx.amount);
            else if (tx.transaction_type === 'WITHDRAWAL') netInvestment -= parseFloat(tx.amount);
        });
        if (netInvestment <= 0) return "N/A";
        const absoluteReturn = ((clientData.currentValue - netInvestment) / netInvestment) * 100;
        return absoluteReturn.toFixed(2);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /><Typography sx={{ml: 2}}>Loading performance data...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Typography color="error">Error: {error}</Typography>
            </Box>
        );
    }

    if (!clientData || !clientData.transactionHistory || clientData.transactionHistory.length === 0) {
        return <Typography variant="h6" color="text.secondary" sx={{mt: 4, textAlign: 'center'}}>No portfolio data found.</Typography>;
    }

    const { clientName, totalUnits, currentValue, latestNav } = clientData;
    const absoluteReturn = calculateAbsoluteReturn();
    const combinedChartData = getCombinedChartData();

    const MetricCard = ({ title, value }) => (
        <Card sx={{ height: '100%', textAlign: 'center' }}><CardContent><Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>{title}</Typography><Typography variant="h5" component="div">{value}</Typography></CardContent></Card>
    );

    const TimePeriodSelector = ({ value, onChange }) => (
        <ToggleButtonGroup value={value} exclusive onChange={onChange} aria-label="time period" size="small">
            <ToggleButton value={1} aria-label="1 month">1M</ToggleButton>
            <ToggleButton value={3} aria-label="3 months">3M</ToggleButton>
            <ToggleButton value={6} aria-label="6 months">6M</ToggleButton>
            <ToggleButton value={12} aria-label="12 months">1Y</ToggleButton>
            <ToggleButton value={null} aria-label="all time">All</ToggleButton>
        </ToggleButtonGroup>
    );

    const IndexSelector = ({ value, onChange }) => (
        <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="index-selector-label">Index</InputLabel>
            <Select
                labelId="index-selector-label"
                value={value}
                label="Index"
                onChange={onChange}
            >
                <MenuItem value="nifty50">Nifty 50</MenuItem>
                <MenuItem value="nifty500">Nifty 500</MenuItem>
            </Select>
        </FormControl>
    );

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = normalizedData.find(item => item.date === label);
            return (
                <Paper sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.95)' }} elevation={3}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{label}</Typography>
                    {payload.map((entry, index) => (
                        <Typography key={index} variant="body2" style={{ color: entry.color }}>
                            {entry.name}: <strong>{entry.value?.toFixed(2)}%</strong>
                        </Typography>
                    ))}
                    {dataPoint && (
                        <>
                            <Typography variant="body2" sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                                <strong>Actual Values:</strong>
                            </Typography>
                            <Typography variant="body2" style={{ color: '#8884d8' }}>
                                Your NAV: <strong>₹{dataPoint.raw.nav.toFixed(4)}</strong>
                            </Typography>
                            <Typography variant="body2" style={{ color: '#82ca9d' }}>
                                {getSelectedIndexName()}: <strong>{dataPoint.raw.index.toFixed(2)}</strong>
                            </Typography>
                        </>
                    )}
                </Paper>
            );
        }
        return null;
    };

    return (
        <Box sx={{ flexGrow: 1, padding: { xs: 1, md: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ color: '#004d40' }}>Welcome, {clientName}!</Typography>
                <Button variant="contained" onClick={handleRefresh} disabled={loading} sx={{ backgroundColor: '#00695c' }}>Refresh Data</Button>
            </Box>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Your Current Value" value={`₹${currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} /></Grid>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Your Total Units" value={totalUnits.toFixed(4)} /></Grid>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Current NAV" value={`₹${parseFloat(latestNav).toFixed(4)}`} /></Grid>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Absolute Return" value={`${absoluteReturn}%`} /></Grid>
            </Grid>

            <Paper sx={{ p: { xs: 1, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h5" gutterBottom sx={{ color: '#004d40' }}>Performance History</Typography>
                    <TimePeriodSelector value={timePeriod} onChange={handleTimePeriodChange} />
                </Box>
                <Box sx={{ height: 400 }}>
                    {combinedChartData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={combinedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis yAxisId="left" width={90} tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                                <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="portfolioValue" stroke="#00695c" strokeWidth={2} activeDot={{ r: 8 }} name="Portfolio Value" />
                                <Line yAxisId="left" type="monotone" dataKey="netInvestment" stroke="#ff7300" strokeDasharray="5 5" name="Net Investment" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}><Typography color="text.secondary">Not enough data for the selected period.</Typography></Box>)}
                </Box>
            </Paper>

            <Paper sx={{ p: { xs: 1, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h5" gutterBottom sx={{ color: '#004d40' }}>
                        Performance vs. {getSelectedIndexName()} (Normalized)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <IndexSelector value={selectedIndex} onChange={handleIndexChange} />
                        <TimePeriodSelector value={timePeriod} onChange={handleTimePeriodChange} />
                    </Box>
                </Box>
                <Box sx={{ height: 400 }}>
                    {normalizedData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={normalizedData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="fundPerformance" stroke="#00695c" strokeWidth={2} name="Your Fund" dot={false} />
                                <Line type="monotone" dataKey="indexPerformance" stroke="#82ca9d" strokeWidth={2} name={getSelectedIndexName()} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column'}}>
                            <Typography color="text.secondary" gutterBottom>
                                No common data found for comparison.
                            </Typography>
                            <Button variant="outlined" onClick={handleRefresh} sx={{ mt: 2 }}>
                                Refresh Data
                            </Button>
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default ClientDashboard;