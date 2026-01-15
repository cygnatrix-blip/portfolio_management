// client/src/components/Layout.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon,
  ListItemText, CssBaseline, Box, IconButton, ListItemButton, useTheme, useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { getAuth } from '../App'; // Import the auth function

const drawerWidth = 240;

// --- Admin Links ---
const adminNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin-dashboard' },
  { text: 'Manage Investors', icon: <PeopleIcon />, path: '/admin-users' },
];

// --- Investor Links ---
const investorNavItems = [
  { text: 'Overall Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'My Portfolios', icon: <AccountBalanceWalletIcon />, path: '/portfolios' },
];

const Main = styled(motion.main, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    width: '100%',
    maxWidth: '100vw',
    overflowX: 'hidden',
    padding: theme.spacing(1),
    [theme.breakpoints.up('sm')]: {
      padding: theme.spacing(2),
    },
    [theme.breakpoints.up('md')]: {
      padding: theme.spacing(2),
    },
    [theme.breakpoints.up('lg')]: {
      padding: theme.spacing(3),
    },
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    // Only apply margin shift on desktop when drawer is persistent
    [theme.breakpoints.up('md')]: {
      marginLeft: `-${drawerWidth}px`,
      ...(open && {
        marginLeft: 0,
      }),
    },
  }),
);

const AppBarStyled = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  // Use theme colors
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
  // Only shift AppBar on desktop
  [theme.breakpoints.up('md')]: {
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

export default function Layout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile); // Start closed on mobile, open on desktop
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuth();

  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login'; // Full reload to clear all state
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setOpen(false); // Auto-close drawer on mobile after navigation
    }
  };

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : investorNavItems;

  return (
    <Box sx={{ display: 'flex', width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <CssBaseline />
      <AppBarStyled position="fixed" open={!isMobile && open} elevation={0}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            sx={{ mr: 2, ...(!isMobile && open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: { xs: '0.95rem', sm: '1.15rem', md: '1.25rem' } }}>
            {isAdmin ? 'Admin Portal' : 'Investor Dash...'}
          </Typography>
          <Typography variant="body1" sx={{ mr: 2, display: { xs: 'none', sm: 'block' }, fontSize: { sm: '0.875rem', md: '1rem' } }}>
            Welcome, {user?.name}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBarStyled>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant={isMobile ? 'temporary' : 'persistent'}
        anchor="left"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
      >
        <DrawerHeader sx={{ justifyContent: 'space-between', px: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Portfolio Manager
          </Typography>
          <IconButton onClick={handleDrawerClose}>
            <ChevronLeftIcon sx={{ color: 'white' }} />
          </IconButton>
        </DrawerHeader>
        <List>
          {navItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Main 
        open={!isMobile && open}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <DrawerHeader />
        {children}
      </Main>
    </Box>
  );
}