import { Box, Typography, Paper, Grid } from '@mui/material';
import UnifiedTransactionForm from '../components/UnifiedTransactionForm';

const AdminActionsPage = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom component="div" sx={{ mb: 4, color: '#1a237e' }}>
        Admin Actions
      </Typography>
      <Grid container spacing={4} justifyContent="center">
        <Grid item xs={12} md={8} lg={6}>
          <Paper sx={{ p: 3, boxShadow: 3, borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ color: '#1a237e', mb: 2 }}>
              New Asset Transaction
            </Typography>
            <UnifiedTransactionForm />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminActionsPage;