// client/src/pages/PortfolioDetailPage.jsx
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Import components
import UnifiedTransactionForm from '../components/UnifiedTransactionForm';
import AssetTransactionsTable from '../components/AssetTransactionsTable';
import ClientTransactionsTable from '../components/ClientTransactionsTable';
import TickerHistoryModal from '../components/TickerHistoryModal';

// Get token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Helper to format currency
const formatCurrency = (value, fractionDigits = 2) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

// Helper for pie chart colors
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#FF6666', '#66CCCC', '#FFD700', '#C0C0C0', '#D2691E'
];

// --- Date Helper (Fixes the Timezone Issue) ---
const toLocalDateString = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fetchPortfolioDetail = async (portfolioId) => {
  const token = getAuthToken();
  const { data } = await axios.get(
    `/api/dashboard/portfolio/${portfolioId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data;
};

// Helper Function for Filters
const filterDataByTimePeriod = (data, dateKey, timePeriod) => {
  if (!timePeriod || timePeriod === 'all') return data; // 'ALL'
  
  const cutoffDate = new Date();
  
  switch(timePeriod) {
    case '1d':
      cutoffDate.setDate(cutoffDate.getDate() - 1);
      break;
    case '1w':
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      break;
    case '1m':
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case '6m':
      cutoffDate.setMonth(cutoffDate.getMonth() - 6);
      break;
    case '1y':
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
    default:
      return data;
  }
  
  return data.filter(item => item && item[dateKey] && new Date(item[dateKey]) >= cutoffDate);
};

// Reusable Filter Components
const TimePeriodSelector = ({ value, onChange }) => (
  <ToggleButtonGroup value={value} exclusive onChange={onChange} aria-label="time period" size="small">
    <ToggleButton value="1d">1D</ToggleButton>
    <ToggleButton value="1w">1W</ToggleButton>
    <ToggleButton value="1m">1M</ToggleButton>
    <ToggleButton value="6m">6M</ToggleButton>
    <ToggleButton value="1y">1Y</ToggleButton>
    <ToggleButton value="all">ALL</ToggleButton>
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

const PortfolioDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(null);

  const [timePeriod, setTimePeriod] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState('nifty50');

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolioDetail', id],
    queryFn: () => fetchPortfolioDetail(id),
  });

  // Memoized hook for Normalized Performance Chart
  const performanceData = useMemo(() => {
    if (!data) return [];

    const combinedData = {};

    // 1. Process ALL data streams using LOCAL dates
    data.navHistory.forEach(nav => {
        const date = toLocalDateString(nav.nav_date); // FIX
        if (!combinedData[date]) combinedData[date] = { date };
        combinedData[date].nav_value = parseFloat(nav.nav_value);
    });
    data.niftyHistory.forEach(nifty => {
        const date = toLocalDateString(nifty.date); // FIX
        if (!combinedData[date]) combinedData[date] = { date };
        combinedData[date].nifty50_value = parseFloat(nifty.price);
    });
    data.nifty500History.forEach(nifty => {
        const date = toLocalDateString(nifty.date); // FIX
        if (!combinedData[date]) combinedData[date] = { date };
        combinedData[date].nifty500_value = parseFloat(nifty.price);
    });
    
    // 2. Sort all data by date
    const allData = Object.values(combinedData);
    const sortedData = allData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Filter by timePeriod
    const filteredData = filterDataByTimePeriod(sortedData, 'date', timePeriod);
    
    // 4. Find the first day *where the FUND has data*
    const firstValidDay = filteredData.find(d => d.nav_value !== undefined && d.nav_value !== null);
    
    // If no fund data found in range, return empty
    if (!firstValidDay) return []; 

    // 5. Get the base values from that *one* starting day
    const baseNav = firstValidDay.nav_value;
    const baseNifty50 = firstValidDay.nifty50_value;
    const baseNifty500 = firstValidDay.nifty500_value;

    // 6. Map the data, normalizing from the correct base
    return filteredData
      .map(d => {
        if (new Date(d.date) < new Date(firstValidDay.date)) return null;

        return {
            date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            actualNav: d.nav_value,
            actualNifty50: d.nifty50_value,
            actualNifty500: d.nifty500_value,
            fundPerformance: (baseNav && d.nav_value) ? ((d.nav_value - baseNav) / baseNav) * 100 : null,
            nifty50Performance: (baseNifty50 && d.nifty50_value) ? ((d.nifty50_value - baseNifty50) / baseNifty50) * 100 : 0,
            nifty500Performance: (baseNifty500 && d.nifty500_value) ? ((d.nifty500_value - baseNifty500) / baseNifty500) * 100 : 0,
        };
      })
      .filter(Boolean);
  }, [data, timePeriod]); 

  // Memoized hook for NAV History Chart
  const navHistoryData = useMemo(() => {
    if (!data) return [];
    // FIX: Use local date string for filtering
    // We map first to ensure format compatibility
    const mappedNav = data.navHistory.map(nav => ({
        ...nav,
        localDate: toLocalDateString(nav.nav_date)
    }));
    
    const filteredNav = filterDataByTimePeriod(mappedNav, 'localDate', timePeriod);
    
    return filteredNav.map(nav => ({
      date: new Date(nav.localDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      NAV: parseFloat(nav.nav_value),
    }));
  }, [data, timePeriod]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; 
      
      const indexName = selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';
      const indexPerfKey = selectedIndex === 'nifty50' ? 'nifty50Performance' : 'nifty500Performance';
      const indexActualKey = selectedIndex === 'nifty50' ? 'actualNifty50' : 'actualNifty500';

      const fundValue = data.fundPerformance;
      const indexValue = data[indexPerfKey];

      return (
        <Paper sx={{ p: 1.5, background: 'rgba(255, 255, 255, 0.9)', border: '1px solid #CCC' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{label}</Typography>
          
          <Typography variant="body2" sx={{ color: '#00695c' }}>
            Your Fund: {fundValue !== null ? `${fundValue.toFixed(2)}%` : 'N/A'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#82ca9d' }}>
            {indexName}: {indexValue !== null ? `${indexValue.toFixed(2)}%` : 'N/A'}
          </Typography>
          
          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" display="block">Actual Values:</Typography>
            <Typography variant="caption" display="block">
              Your NAV: {data.actualNav ? data.actualNav.toFixed(4) : 'N/A'}
            </Typography>
            <Typography variant="caption" display="block">
              {indexName}: {data[indexActualKey] ? data[indexActualKey].toFixed(2) : 'N/A'}
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
  };

  const handlePieClick = (data, index) => {
    // Get the full holding object to access the ticker
    const holding = holdings.find(h => h.name === data.name);
    const ticker = holding?.ticker;
    
    if (ticker && ticker !== 'CASH') {
      setSelectedTicker(ticker);
      setModalOpen(true);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    const is404 = error.response?.status === 404;
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/portfolios')}>
              Go to Portfolios
            </Button>
          }
        >
          {is404 
            ? 'Portfolio not found. It may have been deleted.' 
            : `Error fetching portfolio details: ${error.response?.data?.msg || error.message}`
          }
        </Alert>
      </Container>
    );
  }
  
  const {
    portfolioName,
    latestNav,
    avgNav,
    totalPortfolioValue,
    totalInvestment,
    absoluteCapitalGain,
    totalUnits,
    holdings,
  } = data;

  const pieChartData = holdings.map(h => ({ name: h.name, value: h.value }));
  
  const indexLineKey = selectedIndex === 'nifty50' ? 'nifty50Performance' : 'nifty500Performance';
  const indexLineName = selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3, md: 4 }, mb: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      <Typography 
        variant="h3" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
        }}
      >
        Portfolio: {portfolioName}
      </Typography>

      {/* Stats Grid */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mb: { xs: 3, md: 4 } }}>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Current Value</Typography>
            <Typography variant="h4" color="primary" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>{formatCurrency(totalPortfolioValue)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Total Investment</Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>{formatCurrency(totalInvestment)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Absolute Gain/Loss</Typography>
            <Typography variant="h4" color={absoluteCapitalGain >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>
              {formatCurrency(absoluteCapitalGain)}
            </Typography>
          </Paper>
        </Grid>
         <Grid item xs={6} sm={6} md={4} lg={2}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Total Units</Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>{parseFloat(totalUnits || 0).toFixed(4)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={6} md={4} lg={2}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Current NAV</Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>{parseFloat(latestNav || 0).toFixed(4)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Avg. NAV (Your Cost)</Typography>
            <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>{parseFloat(avgNav || 0).toFixed(4)}</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts and Tables - Using Box for better control */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 } }}>
        {/* Pie Chart */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper 
            elevation={3}
            sx={{ 
              p: { xs: 2, sm: 2.5, md: 3 }, 
              height: { xs: 400, sm: 450, md: 500, lg: 550 }, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 600, 
                color: '#1a237e',
                fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                mb: { xs: 1, sm: 1.5 },
              }}
            >
              Holdings Allocation (Click a slice)
            </Typography>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={isMobile ? 100 : isTablet ? 120 : 140}
                  innerRadius={isMobile ? 50 : isTablet ? 60 : 70}
                  fill="#8884d8"
                  onClick={handlePieClick}
                  paddingAngle={2}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value, name, props) => {
                    const percentage = ((value / totalPortfolioValue) * 100).toFixed(1);
                    return [formatCurrency(value) + ` (${percentage}%)`, name];
                  }}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}
                />
                <Legend 
                  layout={isMobile ? "horizontal" : "vertical"}
                  verticalAlign={isMobile ? "bottom" : "middle"}
                  align={isMobile ? "center" : "right"}
                  wrapperStyle={{
                    fontSize: isMobile ? '9px' : '11px',
                    paddingLeft: isMobile ? 0 : '15px',
                    maxHeight: isMobile ? '100px' : 'none',
                    overflowY: isMobile ? 'auto' : 'visible',
                  }}
                  iconSize={isMobile ? 8 : 10}
                  formatter={(value) => {
                    // Truncate long names for legend
                    if (value.length > 25) {
                      return value.substring(0, 25) + '...';
                    }
                    return value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Holdings Table */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper 
            elevation={3}
            sx={{ 
              p: { xs: 2, sm: 2.5, md: 3 }, 
              height: { xs: 400, sm: 450, md: 500, lg: 550 }, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 600, 
                color: '#1a237e',
                fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                mb: { xs: 1, sm: 1.5 },
              }}
            >
              Holdings Allocation
            </Typography>
            <TableContainer sx={{ flex: 1, overflowX: 'auto' }}>
              <Table stickyHeader size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Asset
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Current Price
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Gain/Loss %
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Allocation Percentage
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Value
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.map((holding, index) => {
                    const percentage = totalPortfolioValue > 0 
                      ? ((holding.value / totalPortfolioValue) * 100).toFixed(1) 
                      : '0.0';
                    const gainLoss = holding.gainLossPercentage || 0;
                    const isCash = holding.name === 'CASH';
                    
                    return (
                      <TableRow 
                        key={index}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: '#e3f2fd',
                            cursor: holding.name !== 'CASH' ? 'pointer' : 'default',
                          }
                        }}
                        onClick={() => {
                          if (holding.ticker && holding.ticker !== 'CASH') {
                            setSelectedTicker(holding.ticker);
                            setModalOpen(true);
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                            <Box 
                              sx={{ 
                                width: { xs: 10, sm: 12 }, 
                                height: { xs: 10, sm: 12 }, 
                                borderRadius: '50%', 
                                bgcolor: COLORS[index % COLORS.length],
                                flexShrink: 0
                              }} 
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                              {holding.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {isCash ? '-' : formatCurrency(holding.currentPrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            bgcolor: isCash ? 'transparent' : (gainLoss >= 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)'),
                          }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 700, 
                                color: isCash ? 'text.secondary' : (gainLoss >= 0 ? 'success.main' : 'error.main'),
                                fontSize: { xs: '0.75rem', sm: '0.875rem' }
                              }}
                            >
                              {isCash ? '-' : `${gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)}%`}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#5c6bc0', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {percentage}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                            {formatCurrency(holding.value)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: '#e8eaf6' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      Total
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      100%
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                      {formatCurrency(totalPortfolioValue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>

      {/* Performance Chart */}
      <Box sx={{ mt: { xs: 2, sm: 3 } }}>
        <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, height: { xs: 400, sm: 450, md: 500, lg: 550 }, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, flexWrap: 'wrap', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Typography 
              variant="h6" 
              gutterBottom 
              component="div" 
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                fontWeight: 600,
                mb: { xs: 1, sm: 0 },
              }}
            >
              Performance vs. Index (Normalized)
            </Typography>
            <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
              <IndexSelector value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)} />
              <TimePeriodSelector value={timePeriod} onChange={(e, newPeriod) => setTimePeriod(newPeriod)} />
            </Box>
          </Box>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData} margin={{ top: 5, right: isMobile ? 5 : 20, left: isMobile ? -20 : 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                fontSize={isMobile ? 9 : 12} 
                angle={-45} 
                textAnchor="end" 
                height={isMobile ? 70 : 80} 
              />
              <YAxis 
                tickFormatter={(value) => `${value.toFixed(1)}%`} 
                fontSize={isMobile ? 10 : 12} 
                domain={['auto', 'auto']} 
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: isMobile ? '11px' : '14px' }} />
              <Line type="monotone" dataKey="fundPerformance" stroke="#00695c" strokeWidth={isMobile ? 1.5 : 2} name="Your Portfolio" dot={false} connectNulls />
              <Line type="monotone" dataKey={indexLineKey} stroke="#82ca9d" strokeWidth={isMobile ? 1.5 : 2} name={indexLineName} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Box>

      {/* Transactions Section */}
      <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }} sx={{ mt: { xs: 1, sm: 2 } }}>
        <Grid item xs={12}>
          <Paper sx={{ p: { xs: 2, sm: 2.5, md: 3 }, borderRadius: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={(e, newValue) => setTabValue(newValue)}
                variant={isMobile ? 'fullWidth' : 'standard'}
                sx={{
                  '& .MuiTab-root': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    minHeight: { xs: 48, sm: 56 },
                  },
                }}
              >
                <Tab label="Add Transaction" />
                <Tab label="Asset Transactions (Buy/Sell)" />
                <Tab label="Fund Transactions (Deposit/Withdraw)" />
              </Tabs>
            </Box>
            
            <Box hidden={tabValue !== 0} sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' } }}>New Transaction</Typography>
              <UnifiedTransactionForm portfolioId={id} />
            </Box>
            
            <Box hidden={tabValue !== 1} sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
              <AssetTransactionsTable portfolioId={id} />
            </Box>
            
            <Box hidden={tabValue !== 2} sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
              <ClientTransactionsTable portfolioId={id} />
            </Box>

          </Paper>
        </Grid>
      </Grid>

      {/* Ticker Modal */}
      <TickerHistoryModal 
        portfolioId={id}
        ticker={selectedTicker}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

    </Container>
  );
};

export default PortfolioDetailPage;