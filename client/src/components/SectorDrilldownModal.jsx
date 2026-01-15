// client/src/components/SectorDrilldownModal.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

// Helper to format currency
const formatCurrency = (value, fractionDigits = 2) =>
  `₹${parseFloat(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

const SectorDrilldownModal = ({ open, onClose, sectorData, totalPortfolioValue }) => {
  if (!sectorData) return null;

  const { sector, value, holdings, percentage } = sectorData;
  
  // Calculate total gain/loss for sector
  const totalInvestment = holdings.reduce((sum, h) => {
    return sum + (h.avgPurchasePrice * h.quantity);
  }, 0);
  
  const sectorGainLoss = value - totalInvestment;
  const sectorGainLossPercentage = totalInvestment > 0 ? (sectorGainLoss / totalInvestment) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, bgcolor: '#1a237e', color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              {sector}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              {holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'} • {percentage.toFixed(2)}% of portfolio
            </Typography>
          </Box>
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3 }}>
        {/* Summary Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ flex: 1, p: 2, textAlign: 'center', bgcolor: '#e3f2fd', minWidth: '150px' }}>
            <Typography variant="body2" color="text.secondary">
              Total Value
            </Typography>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 700, mt: 0.5 }}>
              {formatCurrency(value)}
            </Typography>
          </Paper>
          
          <Paper sx={{ flex: 1, p: 2, textAlign: 'center', bgcolor: '#f3e5f5', minWidth: '150px' }}>
            <Typography variant="body2" color="text.secondary">
              Investment
            </Typography>
            <Typography variant="h5" color="secondary" sx={{ fontWeight: 700, mt: 0.5 }}>
              {formatCurrency(totalInvestment)}
            </Typography>
          </Paper>
          
          <Paper sx={{ 
            flex: 1, 
            p: 2, 
            textAlign: 'center', 
            bgcolor: sectorGainLoss >= 0 ? '#e8f5e9' : '#ffebee',
            minWidth: '150px'
          }}>
            <Typography variant="body2" color="text.secondary">
              Gain/Loss
            </Typography>
            <Typography 
              variant="h5" 
              color={sectorGainLoss >= 0 ? 'success.main' : 'error.main'} 
              sx={{ fontWeight: 700, mt: 0.5 }}
            >
              {formatCurrency(sectorGainLoss)}
            </Typography>
            <Typography 
              variant="caption" 
              color={sectorGainLoss >= 0 ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600 }}
            >
              ({sectorGainLoss >= 0 ? '+' : ''}{sectorGainLossPercentage.toFixed(2)}%)
            </Typography>
          </Paper>
        </Box>

        {/* Holdings Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Ticker</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Quantity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Avg. Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Current Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Gain/Loss</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Value</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>% of Sector</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holdings.map((holding, index) => {
                const holdingInvestment = holding.avgPurchasePrice * holding.quantity;
                const holdingGainLoss = holding.value - holdingInvestment;
                const percentOfSector = (holding.value / value) * 100;
                
                return (
                  <TableRow 
                    key={index}
                    sx={{ 
                      '&:hover': { bgcolor: '#f5f5f5' },
                      '&:nth-of-type(odd)': { bgcolor: '#fafafa' }
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {holding.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {holding.ticker}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {holding.quantity.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatCurrency(holding.avgPurchasePrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(holding.currentPrice)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.25 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 700,
                            color: holding.gainLossPercentage >= 0 ? 'success.main' : 'error.main'
                          }}
                        >
                          {formatCurrency(holdingGainLoss)}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            fontWeight: 600,
                            color: holding.gainLossPercentage >= 0 ? 'success.main' : 'error.main'
                          }}
                        >
                          ({holding.gainLossPercentage >= 0 ? '+' : ''}{holding.gainLossPercentage.toFixed(2)}%)
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                        {formatCurrency(holding.value)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip 
                        label={`${percentOfSector.toFixed(1)}%`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ bgcolor: '#e8eaf6', borderTop: '2px solid #1a237e' }}>
                <TableCell colSpan={6} sx={{ fontWeight: 700, color: '#1a237e' }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                  {formatCurrency(value)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#1a237e' }}>
                  100%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SectorDrilldownModal;
