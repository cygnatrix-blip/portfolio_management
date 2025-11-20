// client/src/theme.js
import { createTheme } from '@mui/material/styles';

// A modern, professional color palette
export const theme = createTheme({
  palette: {
    primary: {
      main: '#0052D4', // A strong, professional blue
      light: '#42a5f5',
      dark: '#00308F',
    },
    secondary: {
      main: '#00C49F', // A vibrant teal/cyan for accents
      light: '#33d0af',
      dark: '#008b6f',
    },
    background: {
      default: '#F4F7FA', // A very light, clean grey for the page background
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C', // Dark grey, not pure black
      secondary: '#4A5568', // Lighter grey for subtext
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '3.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontWeight: 700,
      fontSize: '2.75rem',
      lineHeight: 1.2,
    },
    h3: {
      fontWeight: 600,
      fontSize: '2.25rem',
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none', // Buttons with normal capitalization
      fontWeight: 600,
      borderRadius: 8, // Slightly more rounded buttons
    },
  },
  shape: {
    borderRadius: 8, // Consistent border radius
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)', // A softer, modern shadow
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)', // A subtle shadow for the app bar
        },
      },
    },
  },
});