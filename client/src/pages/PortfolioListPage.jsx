import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link as RouterLink } from 'react-router-dom'; // Added RouterLink
import axios from 'axios';
import {
  Container, Typography, Box, CircularProgress, Alert, Paper,
  Button, Modal, TextField, List, ListItem, ListItemText,
  ListItemAvatar, Avatar, IconButton, Divider, Tooltip as MuiTooltip,
  InputAdornment // <-- Added this import
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon,
  Assessment as AssessmentIcon,
  // Removed AttachMoneyIcon
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip,
} from 'recharts';

// --- Reusable Components ---
const getAuthToken = () => localStorage.getItem('token');
const formatCurrency = (value) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  borderRadius: 3,
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

// --- API Functions ---
const fetchOverallDashboard = async () => {
  const token = getAuthToken();
  const { data } = await axios.get('/api/dashboard/overall', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const createPortfolio = async (portfolioData) => {
  const token = getAuthToken();
  const { data } = await axios.post('/api/portfolios', portfolioData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const deletePortfolio = async (portfolioId) => {
  const token = getAuthToken();
  const { data } = await axios.delete(`/api/portfolios/${portfolioId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// --- MAIN COMPONENT ---
const PortfolioListPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [initialAmount, setInitialAmount] = useState('100000');
  const [error, setError] = useState('');

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['overallDashboard'],
    queryFn: fetchOverallDashboard,
  });

  const createMutation = useMutation({
    mutationFn: createPortfolio,
    onSuccess: (newPortfolio) => {
      queryClient.invalidateQueries({ queryKey: ['overallDashboard'] });
      handleCloseModal();
      navigate(`/portfolio/${newPortfolio.id}`);
    },
    onError: (err) => setError(err.response?.data?.msg || 'Failed to create portfolio'),
  });
  
  const deleteMutation = useMutation({
    mutationFn: deletePortfolio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['overallDashboard'] });
      // Remove the deleted portfolio from cache to prevent refetch errors
      queryClient.removeQueries({ queryKey: ['portfolioDetail'] });
      // Navigate to portfolio list if we were on a detail page
      navigate('/portfolios');
    },
    onError: (err) => setError(err.response?.data?.msg || 'Failed to delete portfolio'),
  });

  // --- Modal Handlers ---
  const handleOpenModal = () => {
    setError('');
    setNewName('');
    setInitialAmount('100000');
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ name: newName, initialAmount: parseFloat(initialAmount) });
  };
  
  const handleDelete = (e, portfolioId) => {
    e.stopPropagation(); // Prevent navigation
    if (window.confirm('Are you sure you want to delete this portfolio? All its data will be lost.')) {
      deleteMutation.mutate(portfolioId);
    }
  };

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  const { portfolios } = data || { portfolios: [] };
  
  // Prepare data for the pie chart (make sure values are numbers)
  const donutChartData = portfolios.map(p => ({ 
    name: p.name, 
    value: parseFloat(p.currentValue) || 0 
  })).filter(p => p.value > 0); // Optional: filter out zero value portfolios to clean up chart

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {queryError && <Alert severity="error" sx={{ mb: 2 }}>Error fetching dashboard: {queryError.response?.data?.msg || queryError.message}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* --- MY PORTFOLIOS SECTION --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          My Portfolios
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={handleOpenModal}
        >
          Create Portfolio
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        
        {/* Donut Chart (40% width) */}
        <Box sx={{ width: { xs: '100%', md: '40%' } }}>
          <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Portfolio Allocation</Typography>
            
            <Box sx={{ flex: 1, width: '100%', minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={2}
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Box>

        {/* Portfolio List (60% width) */}
        <Box sx={{ width: { xs: '100%', md: '60%' } }}>
          <Paper sx={{ p: 2, height: 400, overflowY: 'auto' }}>
            <List>
              {portfolios.length > 0 ? portfolios.map((p, index) => (
                <React.Fragment key={p.portfolio_id}>
                  <ListItem
                    button
                    component={RouterLink} // Use RouterLink for better navigation
                    to={`/portfolio/${p.portfolio_id}`}
                    secondaryAction={
                      <MuiTooltip title="Delete Portfolio">
                        <IconButton edge="end" aria-label="delete" color="error" onClick={(e) => handleDelete(e, p.portfolio_id)}>
                          <DeleteIcon />
                        </IconButton>
                      </MuiTooltip>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>
                        <AssessmentIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="h6">{p.name}</Typography>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                           <Typography variant="body2" component="span">
                            Value: {formatCurrency(p.currentValue)}
                          </Typography>
                          <Typography variant="body2" component="span" color="text.secondary">
                            (Avg. NAV: {parseFloat(p.avgNav || 0).toFixed(4)})
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < portfolios.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              )) : (
                <ListItem>
                  <ListItemText
                    primary="No portfolios found."
                    secondary="Click 'Create Portfolio' to get started."
                    sx={{ textAlign: 'center', py: 4 }}
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Box>
      </Box>
      
      {/* Create Portfolio Modal */}
      <Modal open={modalOpen} onClose={handleCloseModal}>
        <Box component="form" sx={modalStyle} onSubmit={handleSubmit}>
          <Typography variant="h6">Create New Portfolio</Typography>
          <TextField
            label="Portfolio Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Initial Deposit Amount"
            type="number"
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            required
            InputProps={{
              // --- FIX: Use InputAdornment with '₹' ---
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
          />
          <Button type="submit" variant="contained" color="secondary" disabled={createMutation.isPending}>
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default PortfolioListPage;