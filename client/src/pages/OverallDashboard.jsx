// client/src/pages/OverallDashboard.jsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container, Typography, Box, CircularProgress, Alert, Paper, Grid,
  ToggleButton, ToggleButtonGroup, FormControl, InputLabel, Select, MenuItem, useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import {
  ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { motion } from 'framer-motion';

// --- Reusable Components ---
const getAuthToken = () => localStorage.getItem('token');
const formatCurrency = (value) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// --- Date Helper (Fixes the Timezone Issue) ---
const toLocalDateString = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // This uses the browser's local timezone to determine the YYYY-MM-DD date
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

// --- Filter Components ---
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

// --- API Function ---
const fetchOverallDashboard = async () => {
  const token = getAuthToken();
  const { data } = await axios.get('/api/dashboard/overall', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// --- Helper Functions for Graphs ---
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

// --- MAIN COMPONENT ---
const OverallDashboard = () => {
  const theme = useTheme();
  const [timePeriod, setTimePeriod] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState('nifty50');

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['overallDashboard'],
    queryFn: fetchOverallDashboard,
  });

  // --- Graph Data Processing ---
  const { performanceData, historyData } = useMemo(() => {
    if (!data?.graphData) return { performanceData: [], historyData: [] };

    const { overallNavHistory, overallLedgerHistory, nifty50History, nifty500History } = data.graphData;

    // 1. Initialize a Map to aggregate data by date
    const dateMap = new Map();
    const getOrInit = (dateStr) => {
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { 
          date: dateStr, 
          totalValue: 0, 
          totalUnits: 0, 
          investment: 0,
          nifty50: null, 
          nifty500: null 
        });
      }
      return dateMap.get(dateStr);
    };

    // 2. Sum up Portfolio Values AND Units
    overallNavHistory.forEach(nav => {
      // FIX: Use local date string
      const date = toLocalDateString(nav.nav_date);
      const d = getOrInit(date);
      d.totalValue += parseFloat(nav.total_portfolio_value);
      if (nav.total_units_outstanding) {
          d.totalUnits += parseFloat(nav.total_units_outstanding);
      }
    });

    // 3. Add Index Data
    nifty50History.forEach(item => {
        const date = toLocalDateString(item.date);
        if (dateMap.has(date)) getOrInit(date).nifty50 = parseFloat(item.price);
    });
    nifty500History.forEach(item => {
        const date = toLocalDateString(item.date);
        if (dateMap.has(date)) getOrInit(date).nifty500 = parseFloat(item.price);
    });

    // 4. Calculate Investment History
    const sortedLedger = [...overallLedgerHistory].sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
    const sortedDates = Array.from(dateMap.keys()).sort();
    
    sortedDates.forEach(date => {
      const d = dateMap.get(date);
      // FIX: Use local date string for comparison
      const relevantTransactions = sortedLedger.filter(tx => toLocalDateString(tx.transaction_date) <= date);
      let dailyInvest = 0;
      relevantTransactions.forEach(tx => {
          const amt = parseFloat(tx.amount);
          if (tx.transaction_type === 'DEPOSIT') dailyInvest += amt;
          else if (tx.transaction_type === 'WITHDRAWAL') dailyInvest -= amt;
      });
      d.investment = dailyInvest;

      // --- CALCULATE DAILY OVERALL NAV ---
      if (d.totalUnits > 0) {
          d.calculatedOverallNav = d.totalValue / d.totalUnits;
      } else {
          d.calculatedOverallNav = 10; 
      }
    });

    // 5. Filter and Normalize
    const allProcessedData = sortedDates.map(date => dateMap.get(date));
    const filteredData = filterDataByTimePeriod(allProcessedData, 'date', timePeriod);

    // Find the first valid day
    const firstValid = filteredData.find(d => d.calculatedOverallNav > 0 && d.nifty50 > 0);
    
    let finalPerformanceData = [];
    let finalHistoryData = [];

    if (firstValid) {
        const baseNav = firstValid.calculatedOverallNav;
        const baseNifty50 = firstValid.nifty50;
        const baseNifty500 = firstValid.nifty500;

        finalPerformanceData = filteredData.map(d => {
             if (new Date(d.date) < new Date(firstValid.date)) return null;

             return {
                 date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                 // Actual values for Tooltip
                 actualNav: d.calculatedOverallNav, 
                 actualNifty50: d.nifty50,
                 actualNifty500: d.nifty500,
                 
                 // Normalized Performance (%)
                 fundPerformance: ((d.calculatedOverallNav - baseNav) / baseNav) * 100,
                 nifty50Performance: baseNifty50 ? ((d.nifty50 - baseNifty50) / baseNifty50) * 100 : 0,
                 nifty500Performance: baseNifty500 ? ((d.nifty500 - baseNifty500) / baseNifty500) * 100 : 0,
             };
        }).filter(Boolean);

        finalHistoryData = filteredData.map(d => ({
            date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
            "Portfolio Value": d.totalValue,
            "Net Investment": d.investment,
        }));
    }

    return { performanceData: finalPerformanceData, historyData: finalHistoryData };
  }, [data, timePeriod]);

  // --- Custom Tooltip ---
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; 
      const indexName = selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';
      const indexPerfKey = selectedIndex === 'nifty50' ? 'nifty50Performance' : 'nifty500Performance';
      const indexActualKey = selectedIndex === 'nifty50' ? 'actualNifty50' : 'actualNifty500';

      const fundValue = data.fundPerformance;
      const indexValue = data[indexPerfKey];

      return (
        <Paper sx={{ p: 1.5, background: 'rgba(255, 255, 255, 0.95)', border: '1px solid #e0e0e0' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>{label}</Typography>
          
          <Typography variant="body2" sx={{ color: theme.palette.primary.main, fontWeight: 600 }}>
            Your Fund: {fundValue ? (fundValue > 0 ? '+' : '') + fundValue.toFixed(2) : '0.00'}%
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.secondary.main, fontWeight: 600 }}>
            {indexName}: {indexValue ? (indexValue > 0 ? '+' : '') + indexValue.toFixed(2) : '0.00'}%
          </Typography>
          
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
              Overall NAV: <strong>{data.actualNav ? data.actualNav.toFixed(4) : 'N/A'}</strong>
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
              {indexName}: <strong>{data[indexActualKey] ? data[indexActualKey].toFixed(2) : 'N/A'}</strong>
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  const { stats } = data || { stats: {}, portfolios: [] };
  const indexLineKey = selectedIndex === 'nifty50' ? 'nifty50Performance' : 'nifty500Performance';
  const indexLineName = selectedIndex === 'nifty50' ? 'Nifty 50' : 'Nifty 500';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {queryError && <Alert severity="error" sx={{ mb: 2 }}>Error fetching dashboard: {queryError.response?.data?.msg || queryError.message}</Alert>}
      
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
        Overall Dashboard
      </Typography>

      {/* 2x2 Stats Grid */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Overall Value</Typography>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 'bold' }}>{formatCurrency(stats.currentValue)}</Typography>
              </Paper>
            </motion.div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Total Investment</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{formatCurrency(stats.totalInvestment)}</Typography>
              </Paper>
            </motion.div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Overall Gain/Loss</Typography>
                <Typography variant="h4" color={stats.absoluteGain >= 0 ? 'success.main' : 'error.main'} sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(stats.absoluteGain)} ({stats.gainPercentage?.toFixed(2)}%)
                </Typography>
              </Paper>
            </motion.div>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div variants={itemVariants}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>Current Overall NAV</Typography>
                <Typography variant="h4" color="secondary.main" sx={{ fontWeight: 'bold' }}>{parseFloat(stats.currentNav || 0).toFixed(4)}</Typography>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>

      {/* Graph Section - 50/50 Split with Flexbox */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, mb: 4 }}>
        {/* Graph 1: Performance History */}
        <Box sx={{ width: { xs: '100%', lg: '50%' } }}>
          <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom component="div">Performance History</Typography>
                <TimePeriodSelector value={timePeriod} onChange={(e, newPeriod) => setTimePeriod(newPeriod)} />
            </Box>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis tickFormatter={(val) => `₹${(val/100000).toFixed(1)}L`} fontSize={10} />
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="Portfolio Value" stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.2} dot={false} />
                  <Area type="monotone" dataKey="Net Investment" stroke={theme.palette.secondary.main} fill={theme.palette.secondary.main} fillOpacity={0.2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        {/* Graph 2: Performance vs. Index */}
        <Box sx={{ width: { xs: '100%', lg: '50%' } }}>
          <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" gutterBottom component="div">Performance vs. Index</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <IndexSelector value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)} />
                  <TimePeriodSelector value={timePeriod} onChange={(e, newPeriod) => setTimePeriod(newPeriod)} />
                </Box>
            </Box>
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis 
                    tickFormatter={(val) => `${val.toFixed(1)}%`} 
                    fontSize={10} 
                    domain={['auto', 'auto']}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="fundPerformance" stroke={theme.palette.primary.main} strokeWidth={2} name="Your Fund" dot={false} connectNulls />
                  <Line type="monotone" dataKey={indexLineKey} stroke={theme.palette.secondary.main} strokeWidth={2} name={indexLineName} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default OverallDashboard;