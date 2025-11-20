// client/src/investorTheme.js
import { createTheme } from '@mui/material/styles';

// Your requested color palette
const palette = {
  lightGreen: '#DDF4E7',
  mediumGreen: '#67C090',
  teal: '#26667F',
  darkBlue: '#124170',
};

export const investorTheme = createTheme({
  palette: {
    primary: {
      main: palette.mediumGreen, // Use Medium Green as primary
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: palette.teal, // Use Teal as secondary
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F7FA', // Clean light grey background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C',
      secondary: '#4A5568',
    },
    success: {
      main: palette.mediumGreen,
      light: palette.lightGreen,
    },
    error: {
      main: '#E53E3E', // A standard red for losses
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, fontSize: '2.25rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      borderRadius: 8,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
        },
      },
    },
    // Style the Sidebar (from your request)
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.darkBlue, // Dark Blue
          color: '#FFFFFF',
          borderRight: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: '#E0E0E0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&.Mui-selected': {
            color: '#FFFFFF',
            backgroundColor: palette.teal, // Use Teal for selection
            '&:hover': {
              backgroundColor: palette.teal,
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: 'inherit',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: palette.mediumGreen,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          '&.Mui-selected': {
            color: palette.mediumGreen,
          },
        },
      },
    },
  },
});