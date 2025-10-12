import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom'; // Import Outlet
import { jwtDecode } from 'jwt-decode';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  CssBaseline,
  Box,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AdminSidebar from './AdminSidebar';
import ClientSidebar from './ClientSidebar';

const drawerWidth = 240;

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const token = localStorage.getItem('token');
  let isAdmin = false;

  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      isAdmin = decodedToken.client.role === 'admin';
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
    }
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const drawerContent = (
    <div>
      <Toolbar />
      <List sx={{ color: '#ffffff' }}>
        {isAdmin ? <AdminSidebar /> : <ClientSidebar />}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: '#00695c',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
              {isAdmin ? 'Admin Portal' : 'Client Portal'}
            </Link>
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#004d40',
              color: '#fff',
              '& .MuiListItemButton-root:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
              '& .MuiListItemIcon-root': { color: 'inherit' },
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#004d40',
              color: '#fff',
              '& .MuiListItemButton-root:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              },
              '& .MuiListItemIcon-root': { color: 'inherit' },
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          backgroundColor: '#e8f5e9',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        <Outlet /> {/* Renders the matched child route */}
      </Box>
    </Box>
  );
};

export default Layout;