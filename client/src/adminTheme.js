// client/src/adminTheme.js
import { createTheme } from '@mui/material/styles';

// Your requested color palette
const palette = {
  lightGreen: '#DDF4E7',
  mediumGreen: '#67C090',
  teal: '#26667F',
  darkBlue: '#124170',
};

export const adminTheme = createTheme({
  palette: {
    primary: {
      main: palette.darkBlue, // Dark Blue
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: palette.mediumGreen, // Medium Green
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F7FA', // A clean, light grey for the page background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C',
      secondary: '#4A5568',
    },
    // Custom colors
    success: {
      main: palette.mediumGreen,
      light: palette.lightGreen,
    },
    info: {
      main: palette.teal,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 700, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    button: {
      textTransform: 'none',
      fontWeight: 600,
      borderRadius: 8,
    },
  },
  shape: {
    borderRadius: 12, // Softer, modern corners
  },
  components: {
    // Style the Paper (cards)
    MuiPaper: {
      defaultProps: {
        elevation: 0, // Use soft shadows
      },
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E2E8F0',
        },
      },
    },
    // Style the Sidebar
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.darkBlue,
          color: '#FFFFFF',
          borderRight: 'none',
        },
      },
    },
    // Style the Sidebar List Items
    MuiListItemButton: {
      styleOverrides: {
        root: {
          color: '#E0E0E0',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&.Mui-selected': {
            color: '#FFFFFF',
            backgroundColor: palette.teal,
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
    // Style the Buttons
    MuiButton: {
      styleOverrides: {
        containedSecondary: {
          backgroundColor: palette.mediumGreen,
          '&:hover': {
            backgroundColor: palette.teal, // Your requested hover effect
          },
        },
      },
    },
  },
});