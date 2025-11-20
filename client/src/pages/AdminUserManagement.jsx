// client/src/pages/AdminUserManagement.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Container, Typography, Box, CircularProgress, Alert, Paper,
  Button, Modal, TextField, IconButton, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid'; // <-- Import DataGrid
import { Delete as DeleteIcon, LockReset as LockResetIcon, Add as AddIcon } from '@mui/icons-material';

const getAuthToken = () => localStorage.getItem('token');

// --- API Functions (unchanged) ---
const fetchInvestors = async () => {
  const token = getAuthToken();
  const { data } = await axios.get('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const createInvestor = async (investorData) => {
  const token = getAuthToken();
  const { data } = await axios.post('/api/admin/users', investorData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const deleteInvestor = async (userId) => {
  const token = getAuthToken();
  const { data } = await axios.delete(`/api/admin/users/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

const resetPassword = async ({ userId, newPassword }) => {
  const token = getAuthToken();
  const { data } = await axios.put('/api/admin/users/reset-password', 
    { userId, newPassword },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

// Modal Style
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

// --- Main Component ---
const AdminUserManagement = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(null); // 'CREATE' or 'RESET'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const { data: investors, isLoading, error: queryError } = useQuery({
    queryKey: ['investors'],
    queryFn: fetchInvestors,
  });

  const createMutation = useMutation({
    mutationFn: createInvestor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      handleCloseModal();
    },
    onError: (err) => setError(err.response?.data?.msg || 'Failed to create investor'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInvestor,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['investors'] }),
    onError: (err) => setError(err.response?.data?.msg || 'Failed to delete investor'),
  });

  const resetPwdMutation = useMutation({
    mutationFn: resetPassword,
    // --- THIS IS THE FIX ---
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['investors'] });
      handleCloseModal();
      alert(data.msg); // Give user success feedback
    },
    onError: (err) => setError(err.response?.data?.msg || 'Failed to reset password'),
  });

  const handleOpenModal = (type, user = null) => {
    setError('');
    setModalOpen(type);
    setSelectedUser(user);
    setFormData({ name: '', email: '', password: '' });
  };

  const handleCloseModal = () => {
    setModalOpen(null);
    setSelectedUser(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };
  
  const handleResetSubmit = (e) => {
    e.preventDefault();
    resetPwdMutation.mutate({ userId: selectedUser.id, newPassword: formData.password });
  };

  const handleDelete = (userId) => {
    if (window.confirm('Are you sure you want to delete this investor? This will delete all their portfolios and data.')) {
      deleteMutation.mutate(userId);
    }
  };

  // --- Define Columns for DataGrid ---
  const columns = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
    { field: 'email', headerName: 'Email', flex: 1.5, minWidth: 200 },
    { 
      field: 'portfolioCount', 
      headerName: 'Portfolios', 
      type: 'number',
      width: 100 
    },
    { 
      field: 'created_at', 
      headerName: 'Joined On', 
      flex: 1, 
      minWidth: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString('en-IN')
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      filterable: false,
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Box>
          <Tooltip title="Reset Password">
            <IconButton color="primary" onClick={() => handleOpenModal('RESET', params.row)}>
              <LockResetIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Investor">
            <IconButton color="error" onClick={() => handleDelete(params.row.id)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], []); // Removed mutations from dependency array

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Manage Investors
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal('CREATE')}
        >
          Create Investor
        </Button>
      </Box>

      {queryError && <Alert severity="error">Error fetching investors: {queryError.response?.data?.msg || queryError.message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      
      <Paper sx={{ height: 650, width: '100%' }}>
        <DataGrid
          rows={investors || []}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          disableRowSelectionOnClick
          loading={isLoading}
        />
      </Paper>

      {/* Create User Modal */}
      <Modal open={modalOpen === 'CREATE'} onClose={handleCloseModal}>
        <Box component="form" sx={modalStyle} onSubmit={handleCreateSubmit}>
          <Typography variant="h6">Create New Investor</Typography>
          <TextField
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            autoFocus
          />
          <TextField
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <TextField
            label="Initial Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <Button type="submit" variant="contained" color="secondary" disabled={createMutation.isPending}>
            {createMutation.isPending ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </Box>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={modalOpen === 'RESET'} onClose={handleCloseModal}>
        <Box component="form" sx={modalStyle} onSubmit={handleResetSubmit}>
          <Typography variant="h6">Reset Password for {selectedUser?.name}</Typography>
          <TextField
            label="New Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoFocus
          />
          <Button type="submit" variant="contained" color="secondary" disabled={resetPwdMutation.isPending}>
            {resetPwdMutation.isPending ? <CircularProgress size={24} /> : 'Reset'}
          </Button>
        </Box>
      </Modal>
    </Container>
  );
};

export default AdminUserManagement;