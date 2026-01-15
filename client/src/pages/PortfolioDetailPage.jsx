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
  TableSortLabel,
  useTheme,
  useMediaQuery,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Fullscreen as FullscreenIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
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
import SectorDrilldownModal from '../components/SectorDrilldownModal';

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

// --- Table Sorting Helpers ---
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilized = array.map((el, index) => [el, index]);
  stabilized.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilized.map(el => el[0]);
}

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
  const [holdingsModalOpen, setHoldingsModalOpen] = useState(false);
  const [sectorDrilldownOpen, setSectorDrilldownOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [viewMode, setViewMode] = useState('asset'); // 'asset' or 'sector'

  const [timePeriod, setTimePeriod] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState('nifty50');
  // Table sorting state
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('allocation');
  // Holdings filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [gainLossFilter, setGainLossFilter] = useState('all'); // 'all', 'gains', 'losses'

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

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

  // Filter holdings based on search and filters
  const filteredHoldings = useMemo(() => {
    if (!data || !data.holdings) return [];
    
    let filtered = [...data.holdings];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(query) || 
        (h.ticker && h.ticker.toLowerCase().includes(query))
      );
    }
    
    // Apply gain/loss filter
    if (gainLossFilter === 'gains') {
      filtered = filtered.filter(h => (h.gainLossPercentage || 0) > 0);
    } else if (gainLossFilter === 'losses') {
      filtered = filtered.filter(h => (h.gainLossPercentage || 0) < 0);
    }
    
    return filtered;
  }, [data, searchQuery, gainLossFilter]);

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
    if (viewMode === 'sector') {
      // Sector view - open drill-down modal
      const sector = sectorAllocation.find(s => s.sector === data.name);
      if (sector) {
        setSelectedSector(sector);
        setSectorDrilldownOpen(true);
      }
    } else {
      // Asset view - open ticker modal
      const holding = holdings.find(h => h.name === data.name);
      const ticker = holding?.ticker;
      
      if (ticker && ticker !== 'CASH') {
        setSelectedTicker(ticker);
        setModalOpen(true);
      }
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
    sectorAllocation = [],
  } = data;

  const pieChartData = viewMode === 'sector'
    ? sectorAllocation.map(s => ({ name: s.sector, value: s.value }))
    : holdings.map(h => ({ name: h.name, value: h.value }));
  
  const indexLineKey = selectedIndex === 'nifty50' ? 'nifty50Performance' : 'nifty500Performance';
  const indexLineName = selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 1, sm: 2, md: 3, lg: 4 }, mb: { xs: 2, sm: 3, md: 4 }, px: { xs: 0.5, sm: 1, md: 2, lg: 3 }, overflow: 'hidden', maxWidth: '100%' }}>
      <Typography 
        variant="h3" 
        gutterBottom 
        sx={{ 
          fontWeight: 600, 
          mb: { xs: 2, sm: 3 },
          fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem', lg: '3rem' },
          wordBreak: 'break-word',
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
            <Typography 
              variant="body2" 
              color={absoluteCapitalGain >= 0 ? 'success.main' : 'error.main'} 
              sx={{ 
                fontWeight: 600, 
                fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' },
                mt: 0.5
              }}
            >
              ({totalInvestment > 0 ? (absoluteCapitalGain >= 0 ? '+' : '') + ((absoluteCapitalGain / totalInvestment) * 100).toFixed(2) : '0.00'}%)
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
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2, md: 2.5 }, textAlign: 'center', height: '100%', borderRadius: 2 }}>
            <Typography color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.85rem', md: '0.95rem' }, mb: { xs: 0.5, sm: 1 } }}>Available Cash</Typography>
            <Typography variant="h4" color="info.main" sx={{ fontWeight: 600, fontSize: { xs: '1.25rem', sm: '1.75rem', md: '2.125rem' } }}>{formatCurrency(holdings.find(h => h.name === 'CASH')?.value || 0)}</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Charts and Tables - Using Box for better control */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: { xs: 2, sm: 2.5, md: 3 }, mb: { xs: 2, sm: 3 } }}>
        {/* Pie Chart - 40% width on large screens */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 40%' }, minWidth: 0 }}>
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
              Holdings Allocation {viewMode === 'asset' ? '(Click a slice)' : '(By Sector)'}
            </Typography>
            
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              size="small"
              sx={{ mb: 2 }}
            >
              <ToggleButton value="asset">Asset View</ToggleButton>
              <ToggleButton value="sector">Sector View</ToggleButton>
            </ToggleButtonGroup>
            
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 10, right: 5, bottom: 10, left: 10 }}>
                <Pie
                  data={pieChartData}
                  dataKey="value"
                  nameKey="name"
                  cx={isMobile ? "50%" : "46%"}
                  cy="50%"
                  outerRadius={isMobile ? 100 : isTablet ? 105 : 120}
                  innerRadius={isMobile ? 50 : isTablet ? 53 : 60}
                  fill="#8884d8"
                  onClick={handlePieClick}
                  paddingAngle={2}
                >
                  {pieChartData.map((entry, index) => {
                    // Check if this asset has stop loss triggered or target reached
                    const holding = holdings.find(h => h.name === entry.name);
                    const isStopLossTriggered = holding?.isStopLossTriggered || false;
                    const isTargetReached = holding?.isTargetReached || false;
                    
                    // Determine border color (target green overrides stop loss red)
                    let strokeColor = "#fff";
                    let strokeWidth = 2;
                    let className = "";
                    
                    if (isTargetReached) {
                      strokeColor = "#4caf50";
                      strokeWidth = 4;
                      className = "target-reached";
                    } else if (isStopLossTriggered) {
                      strokeColor = "#f44336";
                      strokeWidth = 4;
                      className = "stop-loss-triggered";
                    }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        className={className}
                      />
                    );
                  })}
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
                    fontSize: isMobile ? '9px' : '10.5px',
                    paddingLeft: isMobile ? 0 : '8px',
                    paddingRight: isMobile ? 0 : '5px',
                    maxHeight: isMobile ? '100px' : 'none',
                    overflowY: isMobile ? 'auto' : 'visible',
                    lineHeight: '1.6',
                  }}
                  iconSize={isMobile ? 8 : 9}
                  formatter={(value) => {
                    // Truncate long names for legend
                    if (value.length > 22) {
                      return value.substring(0, 22) + '...';
                    }
                    return value;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Holdings Table - 60% width on large screens */}
        <Box sx={{ flex: { xs: '1 1 100%', lg: '0 0 60%' }, minWidth: 0 }}>
          <Paper 
            elevation={3}
            sx={{ 
              p: { xs: 2, sm: 2.5, md: 3 }, 
              height: { xs: 400, sm: 450, md: 500, lg: 550 }, 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 2,
              cursor: 'pointer',
              position: 'relative',
              '&:hover': {
                boxShadow: 6,
                '& .fullscreen-hint': {
                  opacity: 1,
                },
              },
              transition: 'all 0.3s ease',
            }}
            onDoubleClick={() => setHoldingsModalOpen(true)}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: { xs: 1, sm: 1.5 } }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 600, 
                  color: '#1a237e',
                  fontSize: { xs: '1rem', sm: '1.15rem', md: '1.25rem' },
                }}
              >
                Holdings Allocation
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setHoldingsModalOpen(true)}
                sx={{ 
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                  '&:hover': { 
                    opacity: 1,
                    bgcolor: 'rgba(26, 35, 126, 0.08)',
                  },
                }}
                className="fullscreen-hint"
              >
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Box>
            
            {/* Sort Controls - Mobile Only */}
            {isMobile && (
              <Box sx={{ mb: 1.5 }}>
                <TextField
                  select
                  size="small"
                  label="Sort by"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  sx={{ minWidth: 150, mr: 1, bgcolor: 'white' }}
                >
                  <MenuItem value="serial">Serial No.</MenuItem>
                  <MenuItem value="name">Asset Name</MenuItem>
                  <MenuItem value="allocation">Allocation %</MenuItem>
                  <MenuItem value="quantity">Quantity</MenuItem>
                  <MenuItem value="investment">Investment</MenuItem>
                  <MenuItem value="currentPrice">Current Price</MenuItem>
                  <MenuItem value="gainLoss">Gain/Loss %</MenuItem>
                  <MenuItem value="value">Current Value</MenuItem>
                </TextField>
                <ToggleButtonGroup
                  size="small"
                  value={order}
                  exclusive
                  onChange={(e, newValue) => newValue && setOrder(newValue)}
                >
                  <ToggleButton value="asc">↑ Asc</ToggleButton>
                  <ToggleButton value="desc">↓ Desc</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Search and Filter Controls */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by name or ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  flexGrow: 1, 
                  minWidth: { xs: '100%', sm: '200px' },
                  bgcolor: 'white',
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <ToggleButtonGroup
                size="small"
                value={gainLossFilter}
                exclusive
                onChange={(e, newValue) => newValue && setGainLossFilter(newValue)}
                sx={{ flexShrink: 0 }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="gains" sx={{ color: 'success.main' }}>Gains</ToggleButton>
                <ToggleButton value="losses" sx={{ color: 'error.main' }}>Losses</ToggleButton>
              </ToggleButtonGroup>
              {(searchQuery || gainLossFilter !== 'all') && (
                <Chip
                  label={`${filteredHoldings.length} of ${holdings.length}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary', 
                mb: 1,
                fontStyle: 'italic',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                display: { xs: 'none', sm: 'block' },
              }}
              className="fullscreen-hint"
            >
              Double-click to view fullscreen
            </Typography>
            
            {/* Mobile Card View */}
            {isMobile ? (
              <Box 
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f1f1',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '10px',
                  },
                }}
              >
                {stableSort(filteredHoldings.map((holding, index) => {
                  const investmentValue = (holding.avgPurchasePrice && holding.quantity) ? (parseFloat(holding.avgPurchasePrice) * parseFloat(holding.quantity)) : 0;
                  const allocationNum = totalPortfolioValue > 0 ? ((holding.value / totalPortfolioValue) * 100) : 0;
                  const gainLossNum = holding.gainLossPercentage || 0;
                  return ({
                    ...holding,
                    _serial: index + 1,
                    serial: index + 1,
                    allocation: allocationNum,
                    investment: investmentValue,
                    gainLoss: gainLossNum,
                    currentPrice: holding.currentPrice || 0,
                    quantity: holding.quantity || 0,
                  });
                }), getComparator(order, orderBy)).map((holding) => {
                  const percentage = totalPortfolioValue > 0 ? (holding.allocation).toFixed(1) : '0.0';
                  const gainLoss = holding.gainLoss || 0;
                  const isCash = holding.name === 'CASH';
                  const investmentValue = holding.investment || 0;
                  const currentValue = holding.value || 0;
                  const capitalGainLoss = currentValue - investmentValue;
                  const isStopLossTriggered = holding.isStopLossTriggered || false;
                  const isTargetReached = holding.isTargetReached || false;
                  
                  // Determine border color and background (target green overrides stop loss red)
                  let borderColor = COLORS[(holding._serial - 1) % COLORS.length];
                  let hoverBgColor = '#f5f5f5';
                  let className = '';
                  
                  if (isTargetReached) {
                    borderColor = '#4caf50';
                    hoverBgColor = 'rgba(76, 175, 80, 0.3)';
                    className = 'target-reached';
                  } else if (isStopLossTriggered) {
                    borderColor = '#f44336';
                    hoverBgColor = 'rgba(244, 67, 54, 0.3)';
                    className = 'stop-loss-triggered';
                  }
                  
                  return (
                    <Paper
                      key={holding._serial}
                      elevation={1}
                      className={className}
                      sx={{
                        p: 1.5,
                        mb: 1.5,
                        borderLeft: `4px solid ${borderColor}`,
                        cursor: holding.name !== 'CASH' ? 'pointer' : 'default',
                        '&:hover': {
                          boxShadow: 3,
                          bgcolor: hoverBgColor,
                        },
                      }}
                      onClick={() => {
                        if (holding.ticker && holding.ticker !== 'CASH') {
                          setSelectedTicker(holding.ticker);
                          setModalOpen(true);
                        }
                      }}
                    >
                      {/* Asset Name Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: COLORS[(holding._serial - 1) % COLORS.length],
                              flexShrink: 0
                            }} 
                          />
                          <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#1a237e' }}>
                            {holding.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#5c6bc0', fontSize: '0.85rem' }}>
                          {percentage}%
                        </Typography>
                      </Box>
                      
                      {/* Details Grid */}
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Quantity
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#616161' }}>
                            {isCash ? '-' : (holding.quantity || 0).toLocaleString()}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Investment
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#616161' }}>
                            {isCash ? '-' : formatCurrency(investmentValue, 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Current Value
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#2e7d32' }}>
                            {formatCurrency(holding.value, 0)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Current Price
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                            {isCash ? '-' : formatCurrency(holding.currentPrice, 2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Gain/Loss
                          </Typography>
                          {isCash ? (
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>-</Typography>
                          ) : (
                            <Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 700, 
                                  fontSize: '0.8rem',
                                  color: gainLoss >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                {formatCurrency(capitalGainLoss, 0)}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: '0.7rem',
                                  color: gainLoss >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                ({gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)}%)
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                        {/* Stop Loss Grid Item */}
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Stop Loss
                          </Typography>
                          {isCash ? (
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>-</Typography>
                          ) : holding.stopLossPrice ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 700, 
                                  fontSize: '0.8rem',
                                  color: isStopLossTriggered ? 'error.main' : 'text.primary'
                                }}
                              >
                                {formatCurrency(holding.stopLossPrice, 2)}
                              </Typography>
                              {isStopLossTriggered && (
                                <WarningIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              Not Set
                            </Typography>
                          )}
                        </Grid>
                        {/* Target Price Grid Item */}
                        <Grid item xs={4}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                            Target Price
                          </Typography>
                          {isCash ? (
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>-</Typography>
                          ) : holding.targetPrice ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 700, 
                                  fontSize: '0.8rem',
                                  color: isTargetReached ? 'success.main' : 'text.primary'
                                }}
                              >
                                {formatCurrency(holding.targetPrice, 2)}
                              </Typography>
                              {isTargetReached && (
                                <TrendingUpIcon sx={{ fontSize: '1rem', color: 'success.main' }} />
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                              Not Set
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                      {isStopLossTriggered && (
                        <Box sx={{ mt: 1, p: 0.5, bgcolor: 'error.main', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                            ⚠️ STOP LOSS TRIGGERED!
                          </Typography>
                        </Box>
                      )}
                      {isTargetReached && (
                        <Box sx={{ mt: 1, p: 0.5, bgcolor: 'success.main', borderRadius: 1, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.7rem' }}>
                            🎯 TARGET REACHED!
                          </Typography>
                        </Box>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              /* Desktop Table View */
              <TableContainer 
                sx={{ 
                  flex: 1, 
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '8px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f1f1',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '10px',
                    '&:hover': {
                      backgroundColor: '#555',
                    },
                  },
                }}
              >
                <Table stickyHeader size="medium" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: '#e8eaf6', 
                          color: '#1a237e', 
                          fontSize: '0.825rem',
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          minWidth: 60,
                        }}
                      >
                        <TableSortLabel active={orderBy === 'serial'} direction={orderBy === 'serial' ? order : 'asc'} onClick={() => handleRequestSort('serial')}>
                          Sl. No.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: '#e8eaf6', 
                          color: '#1a237e', 
                          fontSize: '0.875rem',
                          position: 'sticky',
                          left: 60,
                          zIndex: 3,
                          minWidth: 150,
                        }}
                      >
                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')}>
                          Asset
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 100 }}>
                        <TableSortLabel active={orderBy === 'allocation'} direction={orderBy === 'allocation' ? order : 'asc'} onClick={() => handleRequestSort('allocation')}>
                          Allocation %
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 120 }}>
                        <TableSortLabel active={orderBy === 'investment'} direction={orderBy === 'investment' ? order : 'asc'} onClick={() => handleRequestSort('investment')}>
                          Investment
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 120 }}>
                        <TableSortLabel active={orderBy === 'currentPrice'} direction={orderBy === 'currentPrice' ? order : 'asc'} onClick={() => handleRequestSort('currentPrice')}>
                          Current Price
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 120 }}>
                        <TableSortLabel active={orderBy === 'value'} direction={orderBy === 'value' ? order : 'asc'} onClick={() => handleRequestSort('value')}>
                          Value
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 130 }}>
                        <TableSortLabel active={orderBy === 'gainLoss'} direction={orderBy === 'gainLoss' ? order : 'asc'} onClick={() => handleRequestSort('gainLoss')}>
                          Gain/Loss
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 120 }}>
                        Stop Loss
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.875rem', minWidth: 120 }}>
                        Target Price
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                  {stableSort(filteredHoldings.map((holding, index) => {
                    const investmentValue = (holding.avgPurchasePrice && holding.quantity) ? (parseFloat(holding.avgPurchasePrice) * parseFloat(holding.quantity)) : 0;
                    const allocationNum = totalPortfolioValue > 0 ? ((holding.value / totalPortfolioValue) * 100) : 0;
                    const gainLossNum = holding.gainLossPercentage || 0;
                    return ({
                      ...holding,
                      _serial: index + 1,
                      serial: index + 1,
                      allocation: allocationNum,
                      investment: investmentValue,
                      gainLoss: gainLossNum,
                      currentPrice: holding.currentPrice || 0,
                    });
                  }), getComparator(order, orderBy)).map((holding) => {
                    const percentage = totalPortfolioValue > 0 
                      ? (holding.allocation).toFixed(1)
                      : '0.0';
                    const gainLoss = holding.gainLoss || 0;
                    const isCash = holding.name === 'CASH';
                    const investmentValue = holding.investment || 0;
                    const currentValue = holding.value || 0;
                    const capitalGainLoss = currentValue - investmentValue;
                    const isStopLossTriggered = holding.isStopLossTriggered || false;
                    const isTargetReached = holding.isTargetReached || false;
                    
                    // Determine row className (target green overrides stop loss red)
                    let rowClassName = '';
                    let hoverBgColor = '#e3f2fd';
                    
                    if (isTargetReached) {
                      rowClassName = 'target-reached';
                      hoverBgColor = 'rgba(76, 175, 80, 0.4) !important';
                    } else if (isStopLossTriggered) {
                      rowClassName = 'stop-loss-triggered';
                      hoverBgColor = 'rgba(244, 67, 54, 0.4) !important';
                    }
                    
                    return (
                      <TableRow 
                        key={holding._serial}
                        className={rowClassName}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: hoverBgColor,
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
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'white',
                            zIndex: 1,
                            '&:hover': { 
                              bgcolor: '#e3f2fd',
                            },
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {holding._serial}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 60,
                            bgcolor: 'white',
                            zIndex: 1,
                            '&:hover': { 
                              bgcolor: '#e3f2fd',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                              sx={{ 
                                width: 12, 
                                height: 12, 
                                borderRadius: '50%', 
                                bgcolor: COLORS[(holding._serial - 1) % COLORS.length],
                                flexShrink: 0
                              }} 
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                              {holding.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#5c6bc0', fontSize: '0.875rem' }}>
                            {percentage}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#616161', fontSize: '0.875rem' }}>
                            {isCash ? '-' : formatCurrency(investmentValue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                            {isCash ? '-' : formatCurrency(holding.currentPrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '0.875rem' }}>
                            {formatCurrency(holding.value)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {isCash ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              -
                            </Typography>
                          ) : (
                            <Box sx={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: 0.25,
                            }}>
                              <Box sx={{ 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: gainLoss >= 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                              }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: gainLoss >= 0 ? 'success.main' : 'error.main',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  {formatCurrency(capitalGainLoss)}
                                </Typography>
                              </Box>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: gainLoss >= 0 ? 'success.main' : 'error.main',
                                  fontSize: '0.75rem'
                                }}
                              >
                                ({gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)}%)
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {isCash ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              -
                            </Typography>
                          ) : holding.stopLossPrice ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                icon={isStopLossTriggered ? <WarningIcon /> : undefined}
                                label={formatCurrency(holding.stopLossPrice)}
                                size="small"
                                color={isStopLossTriggered ? "error" : "default"}
                                variant={isStopLossTriggered ? "filled" : "outlined"}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                              {isStopLossTriggered && (
                                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.7rem' }}>
                                  TRIGGERED!
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              Not Set
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {isCash ? (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                              -
                            </Typography>
                          ) : holding.targetPrice ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                icon={isTargetReached ? <TrendingUpIcon /> : undefined}
                                label={formatCurrency(holding.targetPrice)}
                                size="small"
                                color={isTargetReached ? "success" : "default"}
                                variant={isTargetReached ? "filled" : "outlined"}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.75rem',
                                }}
                              />
                              {isTargetReached && (
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.7rem' }}>
                                  REACHED!
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                              Not Set
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: '#e8eaf6' }}>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700, 
                        color: '#1a237e', 
                        fontSize: '0.875rem',
                        position: 'sticky',
                        left: 0,
                        bgcolor: '#e8eaf6',
                        zIndex: 1,
                      }}
                    >
                      Total
                    </TableCell>
                    <TableCell 
                      sx={{
                        position: 'sticky',
                        left: 60,
                        bgcolor: '#e8eaf6',
                        zIndex: 1,
                      }}
                    />
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.875rem' }}>
                      100%
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.875rem' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.875rem' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.875rem' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '0.875rem' }}>
                      {formatCurrency(totalPortfolioValue)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            )}
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
      
      {/* Sector Drilldown Modal */}
      <SectorDrilldownModal
        open={sectorDrilldownOpen}
        onClose={() => setSectorDrilldownOpen(false)}
        sectorData={selectedSector}
        totalPortfolioValue={totalPortfolioValue}
      />

      {/* Fullscreen Holdings Modal */}
      <Dialog
        fullScreen
        open={holdingsModalOpen}
        onClose={() => setHoldingsModalOpen(false)}
        TransitionProps={{
          timeout: 300,
        }}
      >
        <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#1a237e', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              Holdings Allocation - {portfolioName}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setHoldingsModalOpen(false)}
              sx={{
                color: 'white',
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, bgcolor: '#f5f5f5' }}>
          <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            {/* Summary Stats - Compact 2x2 Layout */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Total Value
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {formatCurrency(totalPortfolioValue, 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Total Investment
                  </Typography>
                  <Typography variant="h6" color="secondary" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {formatCurrency(totalInvestment, 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: absoluteCapitalGain >= 0 ? '#e8f5e9' : '#ffebee' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Absolute Gain/Loss
                  </Typography>
                  <Typography variant="h6" color={absoluteCapitalGain >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {formatCurrency(absoluteCapitalGain, 0)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Total Holdings
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    {holdings.length} Assets
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Search and Filter Controls */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Search by name or ticker..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  flexGrow: 1, 
                  minWidth: { xs: '100%', sm: '250px' },
                  bgcolor: 'white',
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <ToggleButtonGroup
                size="small"
                value={gainLossFilter}
                exclusive
                onChange={(e, newValue) => newValue && setGainLossFilter(newValue)}
                sx={{ flexShrink: 0 }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="gains" sx={{ color: 'success.main' }}>Gains</ToggleButton>
                <ToggleButton value="losses" sx={{ color: 'error.main' }}>Losses</ToggleButton>
              </ToggleButtonGroup>
              {(searchQuery || gainLossFilter !== 'all') && (
                <Chip
                  label={`Showing ${filteredHoldings.length} of ${holdings.length}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>

            {/* Full Holdings Table */}
            {/* Sort Controls - Mobile Only */}
            {isMobile && (
              <Box sx={{ mb: 1.5 }}>
                <TextField
                  select
                  size="small"
                  label="Sort by"
                  value={orderBy}
                  onChange={(e) => setOrderBy(e.target.value)}
                  sx={{ minWidth: 150, mr: 1, bgcolor: 'white' }}
                >
                  <MenuItem value="serial">Serial No.</MenuItem>
                  <MenuItem value="name">Asset Name</MenuItem>
                  <MenuItem value="allocation">Allocation %</MenuItem>
                  <MenuItem value="quantity">Quantity</MenuItem>
                  <MenuItem value="investment">Investment</MenuItem>
                  <MenuItem value="currentPrice">Current Price</MenuItem>
                  <MenuItem value="gainLoss">Gain/Loss %</MenuItem>
                  <MenuItem value="value">Current Value</MenuItem>
                </TextField>
                <ToggleButtonGroup
                  size="small"
                  value={order}
                  exclusive
                  onChange={(e, newValue) => newValue && setOrder(newValue)}
                >
                  <ToggleButton value="asc">↑ Asc</ToggleButton>
                  <ToggleButton value="desc">↓ Desc</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}
            
            {isMobile ? (
              /* Mobile Card View */
              <Box 
                sx={{ 
                  maxHeight: 'calc(100vh - 400px)',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f1f1',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '10px',
                  },
                }}
              >
                {stableSort(filteredHoldings.map((holding, index) => {
                  const investmentValue = (holding.avgPurchasePrice && holding.quantity) ? (parseFloat(holding.avgPurchasePrice) * parseFloat(holding.quantity)) : 0;
                  const allocationNum = totalPortfolioValue > 0 ? ((holding.value / totalPortfolioValue) * 100) : 0;
                  const gainLossNum = holding.gainLossPercentage || 0;
                  return ({
                    ...holding,
                    _serial: index + 1,
                    serial: index + 1,
                    allocation: allocationNum,
                    investment: investmentValue,
                    gainLoss: gainLossNum,
                    currentPrice: holding.currentPrice || 0,
                    quantity: parseFloat(holding.quantity || 0),
                  });
                }), getComparator(order, orderBy)).map((holding) => {
                  const percentage = totalPortfolioValue > 0 ? (holding.allocation).toFixed(2) : '0.00';
                  const gainLoss = holding.gainLoss || 0;
                  const isCash = holding.name === 'CASH';
                  const investmentValue = holding.investment || 0;
                  const currentValue = holding.value || 0;
                  const capitalGainLoss = currentValue - investmentValue;
                  
                  return (
                    <Paper
                      key={holding._serial}
                      elevation={2}
                      sx={{
                        p: 2,
                        mb: 2,
                        borderLeft: `4px solid ${COLORS[(holding._serial - 1) % COLORS.length]}`,
                        cursor: holding.name !== 'CASH' ? 'pointer' : 'default',
                        '&:hover': {
                          boxShadow: 4,
                          bgcolor: '#fafafa',
                        },
                      }}
                      onClick={() => {
                        if (holding.ticker && holding.ticker !== 'CASH') {
                          setHoldingsModalOpen(false);
                          setSelectedTicker(holding.ticker);
                          setModalOpen(true);
                        }
                      }}
                    >
                      {/* Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Box 
                            sx={{ 
                              width: 14, 
                              height: 14, 
                              borderRadius: '50%', 
                              bgcolor: COLORS[(holding._serial - 1) % COLORS.length],
                              flexShrink: 0,
                              boxShadow: 1,
                            }} 
                          />
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#1a237e' }}>
                            {holding.name}
                          </Typography>
                        </Box>
                        <Chip 
                          label={`${percentage}%`} 
                          size="small" 
                          sx={{ 
                            bgcolor: '#e8eaf6', 
                            color: '#5c6bc0', 
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }} 
                        />
                      </Box>
                      
                      {/* Details Grid */}
                      <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                            Quantity
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {isCash ? '-' : holding.quantity.toFixed(4)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                            Avg. Price
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.secondary' }}>
                            {isCash ? '-' : formatCurrency(holding.avgPurchasePrice)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                            Investment
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.9rem', color: '#616161' }}>
                            {isCash ? '-' : formatCurrency(investmentValue)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                            Current Price
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                            {isCash ? '-' : formatCurrency(holding.currentPrice)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                            Current Value
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#2e7d32' }}>
                            {formatCurrency(holding.value)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
                            Gain/Loss
                          </Typography>
                          {isCash ? (
                            <Typography variant="body1" sx={{ fontSize: '0.9rem' }}>-</Typography>
                          ) : (
                            <Box>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 700, 
                                  fontSize: '0.95rem',
                                  color: gainLoss >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                {formatCurrency(capitalGainLoss)}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: '0.75rem',
                                  color: gainLoss >= 0 ? 'success.main' : 'error.main',
                                  fontWeight: 600,
                                }}
                              >
                                ({gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)}%)
                              </Typography>
                            </Box>
                          )}
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              /* Desktop Table View */
              <TableContainer 
                component={Paper} 
                sx={{ 
                  maxHeight: 'calc(100vh - 300px)',
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    height: '10px',
                    width: '10px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f1f1f1',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#888',
                    borderRadius: '10px',
                    '&:hover': {
                      backgroundColor: '#555',
                    },
                  },
                }}
              >
                <Table stickyHeader sx={{ minWidth: 900 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: '#e8eaf6', 
                          color: '#1a237e', 
                          fontSize: '0.95rem',
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          minWidth: 80,
                        }}
                      >
                        <TableSortLabel active={orderBy === 'serial'} direction={orderBy === 'serial' ? order : 'asc'} onClick={() => handleRequestSort('serial')}>
                          Sl. No.
                        </TableSortLabel>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 700, 
                          bgcolor: '#e8eaf6', 
                          color: '#1a237e', 
                          fontSize: '0.95rem',
                          position: 'sticky',
                          left: 80,
                          zIndex: 3,
                          minWidth: 180,
                        }}
                      >
                        <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleRequestSort('name')}>
                          Asset Name
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 110 }}>
                        <TableSortLabel active={orderBy === 'allocation'} direction={orderBy === 'allocation' ? order : 'asc'} onClick={() => handleRequestSort('allocation')}>
                          Allocation %
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 100 }}>
                        <TableSortLabel active={orderBy === 'quantity'} direction={orderBy === 'quantity' ? order : 'asc'} onClick={() => handleRequestSort('quantity')}>
                          Quantity
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 130 }}>
                        <TableSortLabel active={orderBy === 'investment'} direction={orderBy === 'investment' ? order : 'asc'} onClick={() => handleRequestSort('investment')}>
                          Investment
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 110 }}>
                        Avg. Price
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 130 }}>
                        <TableSortLabel active={orderBy === 'currentPrice'} direction={orderBy === 'currentPrice' ? order : 'asc'} onClick={() => handleRequestSort('currentPrice')}>
                          Current Price
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 140 }}>
                        <TableSortLabel active={orderBy === 'value'} direction={orderBy === 'value' ? order : 'asc'} onClick={() => handleRequestSort('value')}>
                          Current Value
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 150 }}>
                        <TableSortLabel active={orderBy === 'gainLoss'} direction={orderBy === 'gainLoss' ? order : 'asc'} onClick={() => handleRequestSort('gainLoss')}>
                          Gain/Loss
                        </TableSortLabel>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 120 }}>
                        Stop Loss
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: '#e8eaf6', color: '#1a237e', fontSize: '0.95rem', minWidth: 120 }}>
                        Target Price
                      </TableCell>
                    </TableRow>
                  </TableHead>
                <TableBody>
                  {stableSort(filteredHoldings.map((holding, index) => {
                    const investmentValue = (holding.avgPurchasePrice && holding.quantity) ? (parseFloat(holding.avgPurchasePrice) * parseFloat(holding.quantity)) : 0;
                    const allocationNum = totalPortfolioValue > 0 ? ((holding.value / totalPortfolioValue) * 100) : 0;
                    const gainLossNum = holding.gainLossPercentage || 0;
                    return ({
                      ...holding,
                      _serial: index + 1,
                      serial: index + 1,
                      allocation: allocationNum,
                      investment: investmentValue,
                      gainLoss: gainLossNum,
                      currentPrice: holding.currentPrice || 0,
                      quantity: parseFloat(holding.quantity || 0),
                    });
                  }), getComparator(order, orderBy)).map((holding) => {
                    const percentage = totalPortfolioValue > 0 
                      ? (holding.allocation).toFixed(2)
                      : '0.00';
                    const gainLoss = holding.gainLoss || 0;
                    const isCash = holding.name === 'CASH';
                    const investmentValue = holding.investment || 0;
                    const currentValue = holding.value || 0;
                    const capitalGainLoss = currentValue - investmentValue;
                    const isStopLossTriggered = holding.isStopLossTriggered || false;
                    const isTargetReached = holding.isTargetReached || false;
                    
                    return (
                      <TableRow 
                        key={holding._serial}
                        sx={{ 
                          '&:hover': { 
                            bgcolor: '#e3f2fd',
                            cursor: holding.name !== 'CASH' ? 'pointer' : 'default',
                          },
                          '&:nth-of-type(odd)': {
                            bgcolor: '#fafafa',
                          },
                        }}
                        onClick={() => {
                          if (holding.ticker && holding.ticker !== 'CASH') {
                            setHoldingsModalOpen(false);
                            setSelectedTicker(holding.ticker);
                            setModalOpen(true);
                          }
                        }}
                      >
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 0,
                            bgcolor: 'inherit',
                            zIndex: 1,
                          }}
                        >
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {holding._serial}
                          </Typography>
                        </TableCell>
                        <TableCell
                          sx={{
                            position: 'sticky',
                            left: 80,
                            bgcolor: 'inherit',
                            zIndex: 1,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box 
                              sx={{ 
                                width: 16, 
                                height: 16, 
                                borderRadius: '50%', 
                                bgcolor: COLORS[(holding._serial - 1) % COLORS.length],
                                flexShrink: 0,
                                boxShadow: 1,
                              }} 
                            />
                            <Typography variant="body1" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {holding.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#5c6bc0' }}>
                            {percentage}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {isCash ? '-' : holding.quantity.toFixed(4)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#616161' }}>
                            {isCash ? '-' : formatCurrency(investmentValue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                            {isCash ? '-' : formatCurrency(holding.avgPurchasePrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {isCash ? '-' : formatCurrency(holding.currentPrice)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 700, color: '#2e7d32', fontSize: '1.05rem' }}>
                            {formatCurrency(holding.value)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {isCash ? (
                            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                              -
                            </Typography>
                          ) : (
                            <Box sx={{ 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-end',
                              gap: 0.5,
                            }}>
                              <Box sx={{ 
                                display: 'inline-flex', 
                                alignItems: 'center',
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 1.5,
                                bgcolor: gainLoss >= 0 ? 'rgba(46, 125, 50, 0.15)' : 'rgba(211, 47, 47, 0.15)',
                                border: `1px solid ${gainLoss >= 0 ? 'rgba(46, 125, 50, 0.3)' : 'rgba(211, 47, 47, 0.3)'}`,
                              }}>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: gainLoss >= 0 ? 'success.main' : 'error.main',
                                    fontSize: '1rem',
                                  }}
                                >
                                  {formatCurrency(capitalGainLoss)}
                                </Typography>
                              </Box>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: gainLoss >= 0 ? 'success.main' : 'error.main',
                                  fontSize: '0.85rem',
                                }}
                              >
                                ({gainLoss >= 0 ? '+' : ''}{gainLoss.toFixed(2)}%)
                              </Typography>
                            </Box>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {isCash ? (
                            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                              -
                            </Typography>
                          ) : holding.stopLossPrice ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                icon={isStopLossTriggered ? <WarningIcon /> : undefined}
                                label={formatCurrency(holding.stopLossPrice)}
                                size="small"
                                color={isStopLossTriggered ? "error" : "default"}
                                variant={isStopLossTriggered ? "filled" : "outlined"}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                }}
                              />
                              {isStopLossTriggered && (
                                <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, fontSize: '0.7rem' }}>
                                  TRIGGERED!
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              Not Set
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {isCash ? (
                            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                              -
                            </Typography>
                          ) : holding.targetPrice ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                              <Chip
                                icon={isTargetReached ? <TrendingUpIcon /> : undefined}
                                label={formatCurrency(holding.targetPrice)}
                                size="small"
                                color={isTargetReached ? "success" : "default"}
                                variant={isTargetReached ? "filled" : "outlined"}
                                sx={{
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                }}
                              />
                              {isTargetReached && (
                                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700, fontSize: '0.7rem' }}>
                                  REACHED!
                                </Typography>
                              )}
                            </Box>
                          ) : (
                            <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                              Not Set
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: '#e8eaf6', borderTop: '2px solid #1a237e' }}>
                    <TableCell 
                      sx={{ 
                        fontWeight: 700, 
                        color: '#1a237e', 
                        fontSize: '1.1rem',
                        position: 'sticky',
                        left: 0,
                        bgcolor: '#e8eaf6',
                        zIndex: 1,
                      }}
                    >
                      Total
                    </TableCell>
                    <TableCell 
                      sx={{
                        position: 'sticky',
                        left: 80,
                        bgcolor: '#e8eaf6',
                        zIndex: 1,
                      }}
                    />
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '1.1rem' }}>
                      100.00%
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      {formatCurrency(totalInvestment)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e', fontSize: '1.1rem' }}>
                      {formatCurrency(totalPortfolioValue)}
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#1a237e' }}>
                      -
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button onClick={() => setHoldingsModalOpen(false)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default PortfolioDetailPage;