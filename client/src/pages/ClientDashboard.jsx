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

// Helper function to format a date to YYYY-MM-DD using UTC values
const formatDateKey = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) {
        console.error("Invalid date passed to formatDateKey:", date);
        return null;
    }
    const year = d.getUTCFullYear();
    let month = '' + (d.getUTCMonth() + 1);
    let day = '' + d.getUTCDate();
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
    const [selectedIndex, setSelectedIndex] = useState('nifty50');

    const handleTimePeriodChange = (event, newPeriod) => {
        setTimePeriod(newPeriod);
    };

    const handleIndexChange = (event) => {
        setSelectedIndex(event.target.value);
    };

    const fetchAllData = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError("Authentication token not found. Please log in again.");
            setLoading(false);
            return;
        }
        const config = {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
        };

        setLoading(true);
        try {
            const [clientRes, dashboardRes] = await Promise.all([
                axios.get('http://localhost:5000/api/portal/me', config),
                axios.get('http://localhost:5000/api/dashboard', config)
            ]);

            // Enhanced debugging
            console.log('=== FRONTEND API RESPONSE ===');
            console.log('All response keys:', Object.keys(dashboardRes.data));
            console.log('niftyHistory length:', dashboardRes.data.niftyHistory?.length);
            console.log('nifty500History length:', dashboardRes.data.nifty500History?.length);
            console.log('nifty500History exists:', 'nifty500History' in dashboardRes.data);
            if (dashboardRes.data.nifty500History && dashboardRes.data.nifty500History.length > 0) {
                console.log('nifty500History sample:', dashboardRes.data.nifty500History.slice(0, 3));
            }
            console.log('==========================');

            setClientData(clientRes.data);
            setNifty50Data(dashboardRes.data.niftyHistory || []);
            setNifty500Data(dashboardRes.data.nifty500History || []);
            setError(null);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            let errorMsg = `Failed to load data: ${error.message}`;
            if (error.response) {
                 errorMsg = `Failed to load data (${error.response.status}): ${error.response.data?.message || error.message}`;
                 if (error.response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.reload();
                }
            } else if (error.request) {
                 errorMsg = "Failed to load data: No response received from server.";
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData, refreshCount]);

    const handleRefresh = () => {
        setRefreshCount(prev => prev + 1);
    };

    // Memoized filter function
    const filterDataByTimePeriod = useCallback((data, dateKey) => {
        if (!timePeriod) return data;
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - timePeriod);
        return data.filter(item => item && item[dateKey] && new Date(item[dateKey]) >= cutoffDate);
    }, [timePeriod]);

    const getSelectedIndexName = useCallback(() => {
        return selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';
    }, [selectedIndex]);

    // Normalized data calculation
    const normalizedData = useMemo(() => {
        console.log("--- Starting Normalization ---");
        console.log("Selected Index:", selectedIndex);
        console.log("Nifty50 Data length:", nifty50Data.length);
        console.log("Nifty500 Data length:", nifty500Data.length);

        // Determine which index data to use
        const selectedIndexData = selectedIndex === 'nifty50' ? nifty50Data : nifty500Data;

        // Initial checks
        if (!clientData) {
            console.log("❌ clientData is missing");
            return [];
        }
        if (!clientData.navHistory || clientData.navHistory.length < 2) {
            console.log("❌ clientData.navHistory insufficient");
            return [];
        }
        if (!Array.isArray(selectedIndexData) || selectedIndexData.length === 0) {
            console.log(`❌ selectedIndexData for "${selectedIndex}" is empty`);
            return [];
        }

        console.log("✅ All initial checks passed");
        console.log("NAV History count:", clientData.navHistory.length);
        console.log("Index Data count:", selectedIndexData.length);

        const filteredNavHistory = filterDataByTimePeriod(clientData.navHistory, 'nav_date');
        const filteredIndexData = filterDataByTimePeriod(selectedIndexData, 'date');

        console.log("Filtered NAV History:", filteredNavHistory.length);
        console.log("Filtered Index Data:", filteredIndexData.length);

        if (filteredNavHistory.length < 2 || filteredIndexData.length < 2) {
            console.log("❌ Filtered data insufficient");
            return [];
        }

        try {
            // Create index map
            const indexMap = new Map();
            filteredIndexData.forEach(item => {
                const date = item.date;
                const price = item.price;
                if (date && price !== undefined && price !== null && !isNaN(parseFloat(price))) {
                    const dateKey = formatDateKey(date);
                    if (dateKey) {
                        indexMap.set(dateKey, parseFloat(price));
                    }
                }
            });

            console.log("Index Map size:", indexMap.size);

            if (indexMap.size === 0) {
                console.log("❌ Index Map is empty");
                return [];
            }

            // Find matching data points
            const matchingData = filteredNavHistory
                .map((navPoint) => {
                    const dateKey = formatDateKey(navPoint.nav_date);
                    if (!dateKey) return null;

                    const indexPrice = indexMap.get(dateKey);
                    const navValueFloat = parseFloat(navPoint.nav_value);

                    if (indexPrice !== undefined && !isNaN(indexPrice) && !isNaN(navValueFloat)) {
                        return {
                            navDate: navPoint.nav_date,
                            navValue: navValueFloat,
                            indexPrice,
                            dateKey
                        };
                    }
                    return null;
                })
                .filter(Boolean)
                .sort((a, b) => new Date(a.navDate) - new Date(b.navDate));

            console.log("Matching Data Points:", matchingData.length);

            if (matchingData.length < 2) {
                console.log("❌ Insufficient matching data");
                return [];
            }

            // Calculate normalized performance
            const baseNav = matchingData[0].navValue;
            const baseIndex = matchingData[0].indexPrice;

            if (isNaN(baseNav) || isNaN(baseIndex) || baseNav === 0 || baseIndex === 0) {
                console.error("❌ Invalid base values");
                return [];
            }

            const result = matchingData.map((point) => ({
                date: new Date(point.navDate).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
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

            console.log("✅ Normalization successful. Result count:", result.length);
            console.log("--- Ending Normalization ---");

            return result;

        } catch (error) {
            console.error('💥 Error during normalization:', error);
            return [];
        }
    }, [clientData, nifty50Data, nifty500Data, selectedIndex, timePeriod, filterDataByTimePeriod]);

    // Combined chart data
    const combinedChartData = useMemo(() => {
        if (!clientData || !clientData.navHistory || !clientData.transactionHistory) return [];

        const filteredNavHistory = filterDataByTimePeriod(clientData.navHistory, 'nav_date');
        const portfolioDataMap = new Map();
        const sortedTransactions = [...clientData.transactionHistory].sort((a,b) => new Date(a.transaction_date) - new Date(b.transaction_date));

        filteredNavHistory.forEach(historyPoint => {
            const historyDate = new Date(historyPoint.nav_date);
            if (isNaN(historyDate.getTime())) return;

            const transactionsUpToDate = sortedTransactions.filter(tx => tx.transaction_date && new Date(tx.transaction_date) <= historyDate);
            let unitsHeld = 0;
            let netInvestment = 0;
            
            transactionsUpToDate.forEach(tx => {
                const units = parseFloat(tx.units);
                const amount = parseFloat(tx.amount);
                if (isNaN(units) || isNaN(amount)) return;

                if(tx.transaction_type === 'DEPOSIT') {
                    unitsHeld += units;
                    netInvestment += amount;
                } else if(tx.transaction_type === 'WITHDRAWAL') {
                    unitsHeld -= units;
                    netInvestment -= amount;
                }
            });

            const dateStr = historyDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            const navValueFloat = parseFloat(historyPoint.nav_value);
            if (isNaN(navValueFloat)) return;

            const portfolioValue = unitsHeld * navValueFloat;
            if (!isNaN(portfolioValue) && portfolioValue > 0.0001) {
                portfolioDataMap.set(dateStr, { date: dateStr, portfolioValue, netInvestment });
            }
        });

        return Array.from(portfolioDataMap.values());
    }, [clientData, filterDataByTimePeriod]);

    // Absolute return calculation
    const absoluteReturn = useMemo(() => {
        if (!clientData || !clientData.transactionHistory || clientData.transactionHistory.length === 0 || clientData.currentValue === null || isNaN(clientData.currentValue)) return "N/A";

        let netInvestment = 0;
        clientData.transactionHistory.forEach(tx => {
            const amount = parseFloat(tx.amount);
            if(isNaN(amount)) return;
            if(tx.transaction_type === 'DEPOSIT') netInvestment += amount;
            else if (tx.transaction_type === 'WITHDRAWAL') netInvestment -= amount;
        });

        if (netInvestment <= 0) return "N/A";
        const returnCalc = ((clientData.currentValue - netInvestment) / netInvestment) * 100;
        return !isNaN(returnCalc) ? returnCalc.toFixed(2) : "N/A";
    }, [clientData]);

    // Render logic
    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /><Typography sx={{ml: 2}}>Loading performance data...</Typography>
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>
                <Button variant="outlined" onClick={handleRefresh}>Retry</Button>
            </Box>
        );
    }

    if (!clientData || !clientData.transactionHistory || clientData.transactionHistory.length === 0) {
        return <Typography variant="h6" color="text.secondary" sx={{mt: 4, textAlign: 'center'}}>No portfolio data found. Please make a deposit to get started.</Typography>;
    }

    const { clientName, totalUnits, currentValue, latestNav } = clientData;

    // Components
    const MetricCard = ({ title, value }) => (
        <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
                <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>{title}</Typography>
                <Typography variant="h5" component="div">{value}</Typography>
            </CardContent>
        </Card>
    );

    const TimePeriodSelector = ({ value, onChange }) => (
        <ToggleButtonGroup value={value} exclusive onChange={onChange} aria-label="time period" size="small">
            <ToggleButton value={1}>1M</ToggleButton>
            <ToggleButton value={3}>3M</ToggleButton>
            <ToggleButton value={6}>6M</ToggleButton>
            <ToggleButton value={12}>1Y</ToggleButton>
            <ToggleButton value={null}>All</ToggleButton>
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
                <Paper sx={{ p: 1.5, backgroundColor: 'rgba(255, 255, 255, 0.95)' }} elevation={3}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>{label}</Typography>
                    {payload.map((entry, index) => (
                        <Typography key={index} variant="body2" sx={{ fontSize: '0.8rem', color: entry.color }}>
                            {entry.name}: <strong>{entry.value?.toFixed(2)}%</strong>
                        </Typography>
                    ))}
                    {dataPoint && dataPoint.raw && (
                        <>
                            <Typography variant="caption" display="block" sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee', color: 'text.secondary' }}>
                                Actual Values:
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ fontSize: '0.75rem', color: '#00695c' }}>
                                Your NAV: ₹{dataPoint.raw.nav?.toFixed(4)}
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ fontSize: '0.75rem', color: '#82ca9d' }}>
                                {getSelectedIndexName()}: {dataPoint.raw.index?.toFixed(2)}
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
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom sx={{ color: '#004d40' }}>Welcome, {clientName || 'Client'}!</Typography>
                <Button variant="contained" onClick={handleRefresh} disabled={loading} sx={{ backgroundColor: '#00695c', '&:hover': { backgroundColor: '#004d40'} }}>Refresh Data</Button>
            </Box>

            {/* Metric Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Your Current Value" value={!isNaN(currentValue) ? `₹${currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'} /></Grid>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Your Total Units" value={!isNaN(totalUnits) ? totalUnits.toFixed(4) : 'N/A'} /></Grid>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Current NAV" value={!isNaN(latestNav) ? `₹${parseFloat(latestNav).toFixed(4)}` : 'N/A'} /></Grid>
                <Grid item xs={12} sm={6} md={3}><MetricCard title="Absolute Return" value={absoluteReturn !== "N/A" ? `${absoluteReturn}%` : "N/A"} /></Grid>
            </Grid>

            {/* Performance History Chart */}
            <Paper sx={{ p: { xs: 1.5, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h5" component="div" sx={{ color: '#004d40' }}>Performance History</Typography>
                    <TimePeriodSelector value={timePeriod} onChange={handleTimePeriodChange} />
                </Box>
                <Box sx={{ height: 400 }}>
                    {combinedChartData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={combinedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" fontSize={12}/>
                                <YAxis yAxisId="left" width={90} tickFormatter={(value) => `₹${value.toLocaleString('en-IN')}`} fontSize={12} />
                                <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                <Legend />
                                <Line yAxisId="left" type="monotone" dataKey="portfolioValue" stroke="#00695c" strokeWidth={2} activeDot={{ r: 6 }} name="Portfolio Value" dot={false} />
                                <Line yAxisId="left" type="monotone" dataKey="netInvestment" stroke="#ff7300" strokeDasharray="5 5" name="Net Investment" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (<Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}><Typography color="text.secondary">Not enough data to display chart for the selected period.</Typography></Box>)}
                </Box>
            </Paper>

            {/* Normalized Performance Chart */}
            <Paper sx={{ p: { xs: 1.5, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="h5" component="div" sx={{ color: '#004d40' }}>
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
                                <XAxis dataKey="date" fontSize={12} />
                                <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} fontSize={12} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Line type="monotone" dataKey="fundPerformance" stroke="#00695c" strokeWidth={2} name="Your Fund" dot={false} activeDot={{ r: 6 }}/>
                                <Line type="monotone" dataKey="indexPerformance" stroke="#82ca9d" strokeWidth={2} name={getSelectedIndexName()} dot={false} activeDot={{ r: 6 }}/>
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column'}}>
                            <Typography color="text.secondary" gutterBottom>
                                No common data found for comparison for the selected period.
                            </Typography>
                            {!loading && (
                                <Button variant="outlined" onClick={handleRefresh} sx={{ mt: 2 }}>
                                    Refresh Data
                                </Button>
                            )}
                        </Box>
                    )}
                </Box>
            </Paper>
        </Box>
    );
};

export default ClientDashboard;