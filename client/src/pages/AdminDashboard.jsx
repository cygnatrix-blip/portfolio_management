import { useState, useEffect } from 'react';
import axios from 'axios';
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
    return (
      <Typography variant="h6" color="text.secondary" sx={{ mt: 4 }}>
        No portfolio data found. Please log a client deposit to begin.
      </Typography>
    );
  }

  const { latestNav, holdings, navHistory } = dashboardData;
  const navChartData = navHistory.map((historyPoint) => ({
    date: new Date(historyPoint.nav_date).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    }),
    nav: parseFloat(historyPoint.nav_value),
  }));

  const hasHoldingsData = holdings && holdings.length > 0 && holdings.reduce((sum, h) => sum + h.value, 0) > 0;

  const MetricCard = ({ title, value, formatAsCurrency = false }) => (
    <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
      <CardContent>
        <Typography color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div">
          {formatAsCurrency
            ? `₹${parseFloat(value).toLocaleString('en-IN')}`
            : parseFloat(value).toFixed(4)}
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

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography
        variant="h4"
        gutterBottom
        component="div"
        sx={{ mb: 4, color: '#004d40' }} // New Heading Color
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
        <Box sx={{ width: { xs: '100%', sm: '33.33%' } }}>
          <MetricCard title="Current NAV" value={latestNav.nav_value} />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '33.33%' } }}>
          <MetricCard
            title="Total Portfolio Value"
            value={latestNav.total_portfolio_value}
            formatAsCurrency
          />
        </Box>
        <Box sx={{ width: { xs: '100%', sm: '33.33%' } }}>
          <MetricCard
            title="Total Units"
            value={latestNav.total_units_outstanding}
          />
        </Box>
      </Box>

      <Paper
        sx={{ p: { xs: 2, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}
      >
        <Typography
          variant="h5"
          gutterBottom
          component="div"
          sx={{ color: '#004d40', mb: 3 }} // New Heading Color
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
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        width: '100%',
                        gap: '12px',
                      }}
                    >
                      <Typography variant="body1" noWrap title={entry.name}>
                        {entry.name}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{ fontWeight: 'bold', flexShrink: 0 }}
                      >
                        {`₹${entry.value.toLocaleString('en-IN')}`}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
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

      <Paper
        sx={{ p: { xs: 2, md: 3 }, mb: 4, boxShadow: 3, borderRadius: 2 }}
      >
        <Typography variant="h5" gutterBottom sx={{ color: '#004d40' }}> {/* New Heading Color */}
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
                  stroke="#00695c" // Chart Line Color
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