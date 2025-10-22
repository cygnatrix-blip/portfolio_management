import { useState, useEffect } from 'react';
import axios from 'axios';
// ... (all imports remain the same) ...
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';

const AdminDashboard = () => {
  // ... (all state and useEffect logic remains the same) ...
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
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


  if (loading) {
    // ... (loading spinner logic) ...
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!dashboardData || !dashboardData.latestNav) {
    // ... (no data logic) ...
    return (
      <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
        No portfolio data found. Please log a client deposit to begin.
      </Typography>
    );
  }

  const {
    latestNav,
    holdings,
    navHistory,
    totalInvestment,
    absoluteCapitalGain,
    absoluteCapitalPercentage,
  } = dashboardData;

  // ... (navChartData, hasHoldingsData, MetricCard, COLORS, renderCustomizedLabel logic remains the same) ...
  const navChartData = navHistory.map((historyPoint) => ({
    date: new Date(historyPoint.nav_date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    }),
    nav: parseFloat(historyPoint.nav_value),
  }));

  const hasHoldingsData =
    holdings && holdings.length > 0 && holdings.reduce((sum, h) => sum + h.value, 0) > 0;

  const MetricCard = ({ title, value, formatAsCurrency = false }) => (
    <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div">
          {formatAsCurrency
            ? `₹${parseFloat(value).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : value}
        </Typography>
      </CardContent>
    </Card>
  );

  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
  ];

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    if (percent < 0.05) return null;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  const totalPortfolioValue = parseFloat(latestNav.total_portfolio_value);

  const gainLossDisplayValue = `₹${absoluteCapitalGain.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} / ${absoluteCapitalPercentage.toFixed(2)}%`;


  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* ... (Dashboard Title and MetricCard Box remain the same) ... */}
      <Typography
        variant="h4"
        gutterBottom
        component="div"
        sx={{ mb: 4, color: '#004d40' }}
      >
        Dashboard
      </Typography>

      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box sx={{ width: { xs: '100%', sm: '20%' } }}>
          <MetricCard
            title="Current NAV"
            value={parseFloat(latestNav.nav_value).toFixed(4)}
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '20%' } }}>
          <MetricCard
            title="Total Portfolio Value"
            value={latestNav.total_portfolio_value}
            formatAsCurrency
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '20%' } }}>
          <MetricCard
            title="Total Investment"
            value={totalInvestment}
            formatAsCurrency
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '20%' } }}>
          <MetricCard
            title="Absolute Gain/Loss"
            value={gainLossDisplayValue}
            formatAsCurrency={false}
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '20%' } }}>
          <MetricCard
            title="Total Units"
            value={parseFloat(latestNav.total_units_outstanding).toFixed(4)}
          />
        </Box>
      </Box>


      {/* --- PORTFOLIO ALLOCATION (MODIFIED) --- */}
      <Paper
        sx={{ p: { xs: 2, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}
      >
        <Typography
          variant="h5"
          gutterBottom
          component="div"
          sx={{ color: '#004d40', mb: 3 }}
        >
          Portfolio Allocation
        </Typography>

        {hasHoldingsData ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
            }}
          >
            {/* Pie Chart (Unchanged) */}
            <Box sx={{ height: 450, width: { xs: '100%', md: '60%' } }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={holdings}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius="85%"
                    innerRadius="60%"
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {holdings.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Box>

            {/* Legend/Table (MODIFIED) */}
            <Box sx={{ width: { xs: '100%', md: '40%' } }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 400,
                  overflow: 'auto',
                  pr: 2,
                }}
              >
                {/* --- MODIFIED: List Item --- */}
                {holdings.map((entry, index) => (
                  <Box
                    key={`item-${index}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': { backgroundColor: '#f0f0f0' },
                    }}
                  >
                    {/* Color Swatch */}
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: COLORS[index % COLORS.length],
                        mr: 1.5,
                        flexShrink: 0,
                        borderRadius: '4px',
                      }}
                    />

                    {/* Container for Name | Pct | Value */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center', // Vertically align items
                        width: '100%',
                        gap: '12px',
                      }}
                    >
                      {/* Name */}
                      <Typography variant="body1" noWrap title={entry.name}>
                        {entry.name}
                      </Typography>

                      {/* Container for Pct and Value (for right-alignment) */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: { xs: 1.5, md: 3 }, // Space between Pct and Value
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {/* --- NEW: Percentage --- */}
                        <Typography
                          variant="body1"
                          color="text.secondary" // Lighter color
                          sx={{ width: '50px', textAlign: 'right' }} // Fixed width for alignment
                        >
                          {`${entry.percentage.toFixed(1)}%`}
                        </Typography>

                        {/* Value */}
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 'bold',
                            width: '120px', // Fixed width for alignment
                            textAlign: 'right', // Align numbers to the right
                          }}
                        >
                          {`₹${entry.value.toLocaleString('en-IN')}`}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
              
              {/* Total Line (Unchanged) */}
              <hr
                style={{
                  width: '100%',
                  border: 'none',
                  borderTop: '1px solid #eee',
                  margin: '16px 0',
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  mt: 1,
                  px: 1,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Total
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {`₹${totalPortfolioValue.toLocaleString('en-IN')}`}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          // ... (No data box remains the same) ...
          <Box
            sx={{
              height: 450,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">
              No portfolio allocation data available to display.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* ... (Fund Performance Line Chart Paper remains the same) ... */}
      <Paper
        sx={{ p: { xs: 2, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}
      >
        <Typography variant="h5" gutterBottom sx={{ color: '#004d40' }}>
          {' '}
          Fund Performance (NAV History)
        </Typography>
        <Box sx={{ height: 400, mt: 3 }}>
          {navChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={navChartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  width={80}
                  tickFormatter={(value) => `₹${value.toFixed(2)}`}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip formatter={(value) => `₹${value.toFixed(4)}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="nav"
                  stroke="#00695c" 
                  strokeWidth={2}
                  name="NAV"
                  activeDot={{ r: 8 }}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Typography color="text.secondary">
                NAV history will be displayed here.
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminDashboard;