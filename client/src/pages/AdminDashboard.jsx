// client/src/pages/AdminDashboard.jsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Container, Typography, Box, CircularProgress, Alert, Paper, Grid, useTheme } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { DataGrid } from '@mui/x-data-grid';
import { motion } from 'framer-motion';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';

const getAuthToken = () => localStorage.getItem('token');

const fetchAdminDashboard = async () => {
  const token = getAuthToken();
  const { data } = await axios.get(
    '/api/admin/dashboard',
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

// Animation variants for staggering children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <motion.div variants={itemVariants}>
    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: '100%' }}>
      <Box sx={{ 
        mr: 2, 
        p: 1.5,
        borderRadius: '50%',
        backgroundColor: `${color}.light`,
        color: `${color}.dark`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {icon}
      </Box>
      <Box>
        <Typography color="text.secondary">{title}</Typography>
        <Typography variant="h4" component="p" sx={{ fontWeight: 'bold' }}>
          {value}
        </Typography>
      </Box>
    </Paper>
  </motion.div>
);

// Admin Table Columns
const adminColumns = [
  { field: 'id', headerName: 'ID', width: 70 },
  { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
  { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
  { 
    field: 'created_at', 
    headerName: 'Joined On', 
    flex: 1,
    minWidth: 150,
    renderCell: (params) => new Date(params.value).toLocaleDateString('en-IN')
  },
];

const AdminDashboard = () => {
  const theme = useTheme();
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: fetchAdminDashboard,
  });

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">Error: {error.response?.data?.msg || error.message}</Alert>;
  }

  const { stats, tables } = data;
  
  const chartData = [
    { name: 'Admins', value: stats.adminCount || 0 },
    { name: 'Investors', value: stats.investorCount || 0 },
    { name: 'Others', value: Math.max(0, (stats.totalUsers || 0) - (stats.adminCount || 0) - (stats.investorCount || 0)) }
  ];

  const PIE_COLORS = [
    theme.palette.primary.main, 
    theme.palette.secondary.main, 
    theme.palette.grey[400]
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 6 }}>
          Admin Dashboard
        </Typography>

        {/* --- 1. Stat Cards --- */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Total Users" value={stats.totalUsers} icon={<PeopleIcon />} color="primary" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Admin Count" value={stats.adminCount} icon={<AdminPanelSettingsIcon />} color="info" />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard title="Investor Count" value={stats.investorCount} icon={<PersonIcon />} color="success" />
          </Grid>
        </Grid>

        {/* --- 2. Charts & Tables --- */}
        <Grid container spacing={4}>
          {/* Pie Chart */}
          <Grid item xs={12} md={5}>
            <motion.div variants={itemVariants}>
              <Paper 
                sx={{ 
                  p: 3, 
                  height: 450,
                  display: 'flex', 
                  flexDirection: 'column' // Parent is a flex column
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  User Distribution
                </Typography>
                
                {/* --- THIS IS THE FIX --- */}
                {/* This Box now grows to fill the remaining space */}
                <Box sx={{ 
                  flex: 1, // <--- Allow it to grow
                  width: '100%', 
                  minHeight: 0 // <--- The critical fix for recharts
                }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={PIE_COLORS[index % PIE_COLORS.length]} 
                            stroke={theme.palette.background.paper}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} users`, 'Count']}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </motion.div>
          </Grid>

          {/* Admin Table (The working version) */}
          <Grid item xs={12} md={7}>
            <motion.div variants={itemVariants}>
              <Paper 
                sx={{ 
                  p: 3, 
                  height: 450,
                  display: 'flex', 
                  flexDirection: 'column'
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  Admin Users
                </Typography>
                
                <Box sx={{ 
                  flex: 1, 
                  width: '100%',
                  minHeight: 0, // <-- Also add here for consistency
                  // DataGrid specific styling
                  '& .MuiDataGrid-root': {
                    border: 'none',
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: theme.palette.grey[100],
                    borderBottom: `2px solid ${theme.palette.divider}`,
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  },
                }}>
                  <DataGrid
                    rows={tables?.allAdmins || []}
                    columns={adminColumns}
                    pageSizeOptions={[5, 10, 25]}
                    initialState={{
                      pagination: { 
                        paginationModel: { pageSize: 5 } 
                      },
                    }}
                    disableRowSelectionOnClick
                    sx={{
                      '& .MuiDataGrid-columnHeader': {
                        fontWeight: 'bold',
                        fontSize: '0.875rem'
                      }
                    }}
                  />
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default AdminDashboard;