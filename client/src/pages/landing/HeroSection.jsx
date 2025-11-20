// client/src/pages/landing/HeroSection.jsx
import React from 'react';
import { Box, Button, Container, Grid, Typography, Paper, Stack, Chip } from '@mui/material';
import { motion } from 'framer-motion';
import { Link as RouterLink } from 'react-router-dom';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Animation variants for the text content
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring', 
      stiffness: 100,
      damping: 12
    }
  },
};

// Enhanced feature showcase cards with stagger animations
const FeatureItem = ({ icon, title, description, delay, color }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay, type: 'spring', stiffness: 80 }}
  >
    <Box 
      display="flex" 
      alignItems="start"
      sx={{
        '&:hover': {
          '& .feature-icon': {
            transform: 'scale(1.1) rotate(5deg)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          },
          '& .feature-title': {
            color: 'primary.main',
          }
        },
        transition: 'all 0.3s ease'
      }}
    >
      <motion.div
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Box 
          className="feature-icon"
          sx={{ 
            p: 1.5, 
            borderRadius: 2.5, 
            bgcolor: `${color}.main`,
            display: 'flex',
            mr: 2.5,
            minWidth: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${color === 'primary' ? 'rgba(102, 126, 234, 0.4)' : color === 'secondary' ? 'rgba(118, 75, 162, 0.4)' : color === 'success' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`,
            transition: 'all 0.3s ease'
          }}
        >
          {icon}
        </Box>
      </motion.div>
      <Box sx={{ flex: 1 }}>
        <Typography 
          className="feature-title"
          variant="subtitle1" 
          sx={{ 
            fontWeight: 700, 
            mb: 0.5, 
            transition: 'color 0.3s ease',
            fontSize: { xs: '0.9rem', sm: '1rem' }
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            lineHeight: 1.6,
            fontSize: { xs: '0.8rem', sm: '0.875rem' }
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  </motion.div>
);

const AnimatedMockCard = () => (
  <Box sx={{ 
    position: 'relative', 
    width: '100%', 
    display: 'flex', 
    justifyContent: 'center',
    minHeight: { xs: '350px', sm: '400px', md: '500px' },
    mb: { xs: 2, md: 0 }
  }}>
    {/* Main Feature Card */}
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, type: 'spring', stiffness: 80 }}
      style={{ 
        width: '100%', 
        maxWidth: { xs: '100%', sm: '500px', md: '550px' },
        position: 'relative',
        zIndex: 2
      }}
    >
      <Paper 
        elevation={20}
        sx={{ 
          p: { xs: 2.5, sm: 3, md: 4 }, 
          borderRadius: { xs: 3, md: 4 },
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 100%)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          overflow: 'visible',
          mx: { xs: 1, sm: 0 },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '5px',
            background: (theme) => `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s linear infinite',
          },
          '@keyframes shimmer': {
            '0%': { backgroundPosition: '200% 0' },
            '100%': { backgroundPosition: '-200% 0' },
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Box sx={{ mb: { xs: 3, md: 4 } }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800, 
                background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                mb: 1.5,
                fontSize: { xs: '1.25rem', sm: '1.5rem' }
              }}
            >
              Powerful Portfolio Analytics
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontSize: { xs: '0.85rem', sm: '0.95rem' }
              }}
            >
              Everything you need to track and optimize your investments
            </Typography>
          </Box>
        </motion.div>

        {/* Feature List with staggered animations */}
        <Stack spacing={{ xs: 2, md: 3 }}>
          <FeatureItem
            icon={<ShowChartIcon sx={{ color: 'white', fontSize: { xs: 22, sm: 26 } }} />}
            title="Real-time Performance Tracking"
            description="Monitor your portfolio performance vs Nifty 50/500 indices with live updates"
            delay={0.6}
            color="primary"
          />

          <FeatureItem
            icon={<AccountBalanceWalletIcon sx={{ color: 'white', fontSize: { xs: 22, sm: 26 } }} />}
            title="Multiple Portfolio Management"
            description="Create and manage unlimited portfolios for different investment strategies"
            delay={0.75}
            color="secondary"
          />

          <FeatureItem
            icon={<TrendingUpIcon sx={{ color: 'white', fontSize: { xs: 22, sm: 26 } }} />}
            title="Detailed Analytics & Insights"
            description="Get comprehensive reports with NAV history, gains/loss tracking, and more"
            delay={0.9}
            color="success"
          />

          <FeatureItem
            icon={<SecurityIcon sx={{ color: 'white', fontSize: { xs: 22, sm: 26 } }} />}
            title="Secure & Private"
            description="Your financial data is encrypted and protected with industry-standard security"
            delay={1.05}
            color="info"
          />
        </Stack>
      </Paper>
    </motion.div>

    {/* Floating accent cards - Hidden on mobile, shown on tablet and desktop */}
    {/* Live Data Card - Top Right */}
    <Box
      sx={{
        position: 'absolute',
        top: { xs: -15, sm: -20, md: -30 },
        right: { xs: -5, sm: -10, md: -20 },
        zIndex: 3,
        display: { xs: 'none', sm: 'block' }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1, y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 1.2 },
          scale: { duration: 0.6, delay: 1.2 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <Paper
          elevation={12}
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            minWidth: { xs: 80, sm: 90, md: 120 },
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              opacity: 0.95, 
              fontWeight: 600, 
              fontSize: { xs: '0.65rem', md: '0.7rem' } 
            }}
          >
            Live Data
          </Typography>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 800, 
              mt: 0.5,
              fontSize: { xs: '1.1rem', md: '1.5rem' }
            }}
          >
            24/7
          </Typography>
        </Paper>
      </motion.div>
    </Box>

    {/* Fast & Easy Card - Bottom Left */}
    <Box
      sx={{
        position: 'absolute',
        bottom: { xs: -15, sm: -20, md: -30 },
        left: { xs: -5, sm: -10, md: -20 },
        zIndex: 3,
        display: { xs: 'none', sm: 'block' }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1, y: [0, -15, 0], rotate: [0, -5, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 1.4 },
          scale: { duration: 0.6, delay: 1.4 },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          rotate: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
        }}
      >
        <Paper
          elevation={12}
          sx={{
            p: { xs: 1.5, md: 2 },
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            minWidth: { xs: 80, sm: 90, md: 110 },
            textAlign: 'center',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          }}
        >
          <SpeedIcon sx={{ fontSize: { xs: 24, md: 28 }, mb: 0.5 }} />
          <Typography 
            variant="caption" 
            sx={{ 
              fontWeight: 700, 
              display: 'block', 
              fontSize: { xs: '0.65rem', md: '0.7rem' } 
            }}
          >
            Fast & Easy
          </Typography>
        </Paper>
      </motion.div>
    </Box>
  </Box>
);

const HeroSection = () => {
  return (
    <Box 
      sx={{ 
        position: 'relative',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: { xs: 6, sm: 8, md: 12 },
        minHeight: { xs: 'auto', md: '90vh' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 85% 80%, rgba(255, 255, 255, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }
      }}
    >
      {/* Animated background shapes */}
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          top: '5%',
          right: '10%',
          width: { xs: '100px', sm: '150px', md: '300px' },
          height: { xs: '100px', sm: '150px', md: '300px' },
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          background: 'linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'block' }
        }}
      />
      
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.3, 1],
          rotate: [360, 180, 0],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: { xs: '120px', sm: '180px', md: '350px' },
          height: { xs: '120px', sm: '180px', md: '350px' },
          borderRadius: '63% 37% 54% 46% / 55% 48% 52% 45%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03))',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'block' }
        }}
      />

      {/* Floating particles - Reduced on mobile */}
      {[...Array(4)].map((_, i) => (
        <Box
          key={i}
          component={motion.div}
          animate={{
            y: [0, -80, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 5 + i * 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut"
          }}
          sx={{
            position: 'absolute',
            bottom: `${10 + i * 15}%`,
            left: `${10 + i * 20}%`,
            width: { xs: '3px', md: '6px' },
            height: { xs: '3px', md: '6px' },
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.6)',
            pointerEvents: 'none',
            display: { xs: 'none', sm: 'block' }
          }}
        />
      ))}

      <Container 
        maxWidth="lg" 
        sx={{ 
          position: 'relative', 
          zIndex: 1,
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Grid 
          container 
          spacing={{ xs: 3, md: 6 }} 
          alignItems="center" 
          justifyContent="center"
          sx={{ 
            display: 'flex',
            flexWrap: { xs: 'wrap', md: 'nowrap' },
            width: '100%',
            // CHANGED: Normal column order on mobile, row on desktop
            flexDirection: { xs: 'column', md: 'row' }
          }}
        >
          {/* Left Content - Text Section - NOW FIRST ON MOBILE */}
          <Grid 
            item 
            xs={12} 
            md={6}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 0%',
              minWidth: 0,
              // Ensure this comes first in mobile view
              order: { xs: 1, md: 1 }
            }}
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              style={{ width: '100%' }}
            >
              <motion.div variants={itemVariants}>
                <Chip 
                  label="Power Real-time Portfolio Tracking" 
                  sx={{ 
                    mb: 3,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: { xs: '0.7rem', sm: '0.8rem' },
                    py: 1,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.25)',
                    },
                    display: { xs: 'inline-flex', sm: 'inline-flex' }
                  }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Typography 
                  variant="h1" 
                  component="h1" 
                  gutterBottom
                  sx={{ 
                    fontWeight: 900, 
                    color: 'white',
                    lineHeight: 1.1,
                    fontSize: { xs: '1.75rem', sm: '2.25rem', md: '3rem', lg: '3.5rem' },
                    mb: { xs: 2, md: 3 },
                    textShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    textAlign: { xs: 'center', md: 'left' }
                  }}
                >
                  Master Your
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'block',
                      background: 'linear-gradient(90deg, #FFD700, #FFA500)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      mt: 1
                    }}
                  >
                    Investment Journey
                  </Box>
                </Typography>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Typography 
                  variant="h6" 
                  paragraph
                  sx={{ 
                    mb: { xs: 3, md: 4 }, 
                    color: 'rgba(255, 255, 255, 0.95)',
                    maxWidth: '540px',
                    lineHeight: 1.7,
                    fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                    fontWeight: 400,
                    mx: { xs: 'auto', md: 0 },
                    textAlign: { xs: 'center', md: 'left' }
                  }}
                >
                  Track multiple portfolios, analyze performance against market indices, and make data-driven investment decisions with confidence.
                </Typography>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  sx={{ 
                    mb: { xs: 3, md: 4 },
                    justifyContent: { xs: 'center', md: 'flex-start' },
                    display: 'flex',
                    flexWrap: 'wrap'
                  }}
                >
                  <Button 
                    variant="contained" 
                    size="large" 
                    component={RouterLink}
                    to="/register"
                    endIcon={<ArrowForwardIcon />}
                    sx={{ 
                      py: { xs: 1.5, sm: 1.8 }, 
                      px: { xs: 3, sm: 4 }, 
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      fontWeight: 700,
                      bgcolor: 'white',
                      color: 'primary.main',
                      boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                      borderRadius: 2,
                      '&:hover': {
                        bgcolor: 'grey.100',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                      },
                      transition: 'all 0.3s ease',
                      flex: { xs: '1 1 auto', sm: '0 1 auto' },
                      minWidth: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    Start Free Today
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    component={RouterLink}
                    to="/login"
                    sx={{ 
                      py: { xs: 1.5, sm: 1.8 }, 
                      px: { xs: 3, sm: 4 }, 
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      fontWeight: 600,
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      color: 'white',
                      borderWidth: 2,
                      borderRadius: 2,
                      backdropFilter: 'blur(10px)',
                      '&:hover': {
                        borderColor: 'white',
                        borderWidth: 2,
                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                      flex: { xs: '1 1 auto', sm: '0 1 auto' },
                      minWidth: { xs: '100%', sm: 'auto' }
                    }}
                  >
                    Sign In
                  </Button>
                </Stack>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Stack 
                  direction="row" 
                  spacing={{ xs: 2, md: 4 }} 
                  sx={{ 
                    mt: 2,
                    justifyContent: { xs: 'space-around', md: 'flex-start' },
                    flexWrap: 'wrap',
                    gap: { xs: 2, md: 4 }
                  }}
                >
                  <Box sx={{ 
                    textAlign: { xs: 'center', md: 'left' },
                    minWidth: { xs: '30%', sm: 'auto' }
                  }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'white',
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
                      }}
                    >
                      500+
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Active Users
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    textAlign: { xs: 'center', md: 'left' },
                    minWidth: { xs: '30%', sm: 'auto' }
                  }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'white',
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
                      }}
                    >
                      ₹10Cr+
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Assets Tracked
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    textAlign: { xs: 'center', md: 'left' },
                    minWidth: { xs: '30%', sm: 'auto' }
                  }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 800, 
                        color: 'white',
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.25rem' }
                      }}
                    >
                      99.9%
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' }
                      }}
                    >
                      Uptime
                    </Typography>
                  </Box>
                </Stack>
              </motion.div>
            </motion.div>
          </Grid>

          {/* Right Content - Feature Card - NOW SECOND ON MOBILE */}
          <Grid 
            item 
            xs={12} 
            md={6}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'center', md: 'flex-start' },
              justifyContent: 'center',
              flex: '1 1 0%',
              minWidth: 0,
              mb: { xs: 2, md: 0 },
              // CHANGED: This comes second in mobile view
              order: { xs: 2, md: 2 }
            }}
          >
            <AnimatedMockCard />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HeroSection;