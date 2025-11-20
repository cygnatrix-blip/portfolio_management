// client/src/pages/landing/Navbar.jsx
import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Container,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Link as RouterLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { name: 'Home', path: '#', highlight: false },
  { name: 'Features', path: '#features', highlight: false },
  { name: 'About Us', path: '#about', highlight: false },
  { name: 'Contact', path: '#contact', highlight: false },
];

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Scroll listener with active section detection
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setScrolled(scrollPosition > 20);

      // Detect active section
      const sections = navItems.map(item => item.path.replace('#', ''));
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop - 100 && scrollPosition < offsetTop + offsetHeight - 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const handleNavClick = (path) => {
    if (path.startsWith('#')) {
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Mobile Drawer Content
  const drawer = (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}
    >
      {/* Drawer Header */}
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <TrendingUpIcon sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Zupeon
          </Typography>
        </Box>
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            color: 'white',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />

      {/* Navigation Links */}
      <List sx={{ px: 2, py: 3 }}>
        {navItems.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ListItem disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component="a"
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.path);
                }}
                sx={{
                  borderRadius: 2,
                  py: 1.5,
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                  },
                  bgcolor:
                    activeSection === item.path.replace('#', '')
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'transparent',
                }}
              >
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{
                    fontWeight: activeSection === item.path.replace('#', '') ? 700 : 500,
                    fontSize: '1.05rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          </motion.div>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', mx: 2 }} />

      {/* Mobile CTA Buttons */}
      <Box sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            fullWidth
            startIcon={<LoginIcon />}
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              borderWidth: 2,
              py: 1.5,
              fontWeight: 600,
              '&:hover': {
                borderColor: 'white',
                borderWidth: 2,
                bgcolor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            Sign In
          </Button>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            fullWidth
            startIcon={<PersonAddIcon />}
            sx={{
              bgcolor: 'white',
              color: '#667eea',
              py: 1.5,
              fontWeight: 700,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.95)',
              },
            }}
          >
            Get Started Free
          </Button>
        </Stack>
      </Box>

      {/* Drawer Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 3,
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', textAlign: 'center' }}>
          © 2025 Zupeon. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
      <AppBar
        component={motion.nav}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        elevation={scrolled ? 8 : 0}
        sx={{
          background: scrolled
            ? 'rgba(255, 255, 255, 0.98)'
            : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s ease-in-out',
          borderBottom: scrolled ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: scrolled
            ? '0 4px 30px rgba(0, 0, 0, 0.1)'
            : 'none',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ py: { xs: 1, md: 1.5 }, px: { xs: 0, sm: 2 } }}>
            {/* Mobile Menu Icon */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{
                mr: 2,
                display: { md: 'none' },
                color: 'text.primary',
                '&:hover': {
                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box
              component={RouterLink}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textDecoration: 'none',
                flexGrow: { xs: 1, md: 0 },
              }}
            >
              <motion.div
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
              >
                <Box
                  sx={{
                    width: { xs: 36, md: 42 },
                    height: { xs: 36, md: 42 },
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: scrolled
                      ? '0 4px 14px rgba(102, 126, 234, 0.4)'
                      : '0 2px 8px rgba(102, 126, 234, 0.3)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: { xs: 20, md: 24 }, color: 'white' }} />
                </Box>
              </motion.div>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.1rem', md: '1.3rem' },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  display: { xs: 'block', sm: 'block' },
                }}
              >
                Zupeon
              </Typography>
            </Box>

            {/* Desktop Navigation Links */}
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1,
                ml: 6,
                flexGrow: 1,
              }}
            >
              {navItems.map((item) => {
                const isActive = activeSection === item.path.replace('#', '');
                return (
                  <motion.div key={item.name} whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      component="a"
                      href={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(item.path);
                      }}
                      sx={{
                        color: isActive ? 'primary.main' : 'text.primary',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.95rem',
                        px: 2,
                        py: 1,
                        position: 'relative',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.08)',
                          color: 'primary.main',
                        },
                        transition: 'all 0.3s ease',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: isActive ? '60%' : '0%',
                          height: '2px',
                          bgcolor: 'primary.main',
                          transition: 'width 0.3s ease',
                        },
                        '&:hover::after': {
                          width: '60%',
                        },
                      }}
                    >
                      {item.name}
                    </Button>
                  </motion.div>
                );
              })}
            </Box>

            {/* Desktop CTA Buttons */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 2, alignItems: 'center' }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  component={RouterLink}
                  to="/login"
                  variant="outlined"
                  startIcon={<LoginIcon />}
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    fontWeight: 600,
                    px: 2.5,
                    py: 1,
                    borderWidth: 2,
                    borderRadius: 2,
                    '&:hover': {
                      borderWidth: 2,
                      bgcolor: 'rgba(102, 126, 234, 0.08)',
                    },
                  }}
                >
                  Sign In
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  component={RouterLink}
                  to="/register"
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 700,
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                    },
                  }}
                >
                  Get Started
                </Button>
              </motion.div>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Offset Toolbar */}
      <Toolbar sx={{ minHeight: { xs: 64, md: 80 } }} />
    </>
  );
}

export default Navbar;