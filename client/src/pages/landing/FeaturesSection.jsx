// client/src/pages/landing/FeaturesSection.jsx
import React from 'react';
import { Box, Container, Grid, Paper, Typography, Stack, Chip, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import BarChartIcon from '@mui/icons-material/BarChart';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';

const mainFeatures = [
  {
    icon: <AccountBalanceWalletIcon sx={{ fontSize: 48 }} />,
    title: 'Multi-Portfolio Management',
    description: 'Organize your investments across multiple portfolios. Keep your retirement funds, growth stocks, and dividend portfolios completely separate with independent tracking and analytics.',
    color: '#6366f1',
    stats: 'Unlimited Portfolios',
    highlights: ['Independent Silos', 'Custom Categories', 'Easy Switching']
  },
  {
    icon: <BarChartIcon sx={{ fontSize: 48 }} />,
    title: 'Advanced Performance Analytics',
    description: 'Track your true performance with sophisticated metrics including Average NAV, XIRR calculations, and real-time comparison against Nifty 50 and Nifty 500 benchmark indices.',
    color: '#8b5cf6',
    stats: 'Real-time Updates',
    highlights: ['NAV Tracking', 'XIRR Returns', 'Benchmark Compare']
  },
  {
    icon: <VerifiedUserIcon sx={{ fontSize: 48 }} />,
    title: 'Enterprise-Grade Security',
    description: 'Your financial data is protected with bank-level encryption and security protocols. We never share your data, and all portfolios are privately linked to your secure account.',
    color: '#06b6d4',
    stats: '256-bit Encryption',
    highlights: ['Secure Storage', 'Private Data', 'Compliance Ready']
  },
];

const additionalFeatures = [
  {
    icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
    title: 'Live Market Data',
    description: 'Access real-time prices for stocks, mutual funds, and ETFs with automatic daily updates.',
    color: '#10b981'
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 32 }} />,
    title: 'Detailed Reports',
    description: 'Generate comprehensive reports with transaction history and gain/loss analysis.',
    color: '#f59e0b'
  },
  {
    icon: <CloudDoneIcon sx={{ fontSize: 32 }} />,
    title: 'Cloud Synced',
    description: 'Your data is automatically synced across all devices with secure cloud backup.',
    color: '#3b82f6'
  },
  {
    icon: <SyncIcon sx={{ fontSize: 32 }} />,
    title: 'Auto Import',
    description: 'Import transactions easily and let our system automatically fetch the latest prices.',
    color: '#ec4899'
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1]
    }
  },
};

const titleVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1]
    }
  },
};

// Main Feature Card Component
const MainFeatureCard = ({ icon, title, description, color, stats, highlights, index }) => (
  <motion.div
    variants={cardVariants}
    whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}
  >
    <Paper 
      elevation={0}
      sx={{ 
        p: { xs: 4, md: 5 },
        height: '100%',
        background: 'white',
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: color,
          boxShadow: `0 20px 50px -12px ${color}25`,
          '& .icon-wrapper': {
            background: color,
            transform: 'scale(1.05)',
          },
          '& .stat-badge': {
            background: color,
            color: 'white',
          },
          '& .feature-number': {
            color: color,
          }
        },
      }}
    >
      {/* Feature Number */}
      <Typography
        className="feature-number"
        sx={{
          position: 'absolute',
          top: 20,
          right: 24,
          fontSize: '3.5rem',
          fontWeight: 900,
          color: 'grey.100',
          lineHeight: 1,
          transition: 'color 0.3s ease',
        }}
      >
        {String(index + 1).padStart(2, '0')}
      </Typography>

      {/* Icon */}
      <Box 
        className="icon-wrapper"
        sx={{ 
          width: 72,
          height: 72,
          borderRadius: 2.5,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          color: color,
          transition: 'all 0.3s ease',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {icon}
      </Box>

      {/* Title & Description */}
      <Typography 
        variant="h5" 
        component="h3" 
        gutterBottom
        sx={{ 
          fontWeight: 700,
          mb: 2,
          fontSize: { xs: '1.25rem', md: '1.5rem' },
          color: 'grey.900',
        }}
      >
        {title}
      </Typography>

      <Typography 
        variant="body1" 
        color="text.secondary"
        sx={{ 
          mb: 3,
          lineHeight: 1.8,
          fontSize: '0.9375rem',
        }}
      >
        {description}
      </Typography>

      {/* Stats Badge */}
      <Box
        className="stat-badge"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 2,
          py: 0.75,
          borderRadius: 1.5,
          background: `${color}10`,
          color: color,
          fontSize: '0.8125rem',
          fontWeight: 700,
          mb: 3,
          transition: 'all 0.3s ease',
        }}
      >
        {stats}
      </Box>

      {/* Highlights */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {highlights.map((highlight) => (
          <Chip
            key={highlight}
            label={highlight}
            size="small"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              height: 26,
              bgcolor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.200',
              color: 'grey.700',
              '&:hover': {
                bgcolor: 'grey.100',
              }
            }}
          />
        ))}
      </Stack>
    </Paper>
  </motion.div>
);

// Additional Feature Card Component
const AdditionalFeatureCard = ({ icon, title, description, color }) => (
  <motion.div
    variants={cardVariants}
    whileHover={{ x: 4, transition: { duration: 0.2 } }}
  >
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2.5,
        p: 3,
        borderRadius: 2.5,
        background: 'white',
        border: '1px solid',
        borderColor: 'grey.100',
        transition: 'all 0.3s ease',
        height: '100%',
        '&:hover': {
          borderColor: `${color}40`,
          background: `${color}05`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          '& .additional-icon': {
            background: color,
            color: 'white',
            transform: 'rotate(5deg) scale(1.1)',
          }
        }
      }}
    >
      <Box 
        className="additional-icon"
        sx={{ 
          width: 56,
          height: 56,
          minWidth: 56,
          borderRadius: 2,
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          transition: 'all 0.3s ease',
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 700,
            mb: 0.75,
            fontSize: '1.0625rem',
            color: 'grey.900',
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            lineHeight: 1.6,
            fontSize: '0.875rem',
          }}
        >
          {description}
        </Typography>
      </Box>
    </Box>
  </motion.div>
);

const FeaturesSection = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box 
      id="features" 
      sx={{ 
        py: { xs: 12, md: 16 },
        background: '#fafafa',
        position: 'relative',
      }}
    >
      <Container maxWidth="lg">
        {/* Section Header */}
        <motion.div
          variants={titleVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 }, maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Box sx={{ height: 1, width: 40, background: 'linear-gradient(90deg, transparent, #6366f1)', mr: 2 }} />
              <Chip 
                label="FEATURES" 
                sx={{ 
                  bgcolor: '#6366f1',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.5px',
                  height: 28,
                }}
              />
              <Box sx={{ height: 1, width: 40, background: 'linear-gradient(90deg, #6366f1, transparent)', ml: 2 }} />
            </Box>
            
            <Typography 
              variant="h2" 
              component="h2" 
              sx={{ 
                fontWeight: 900,
                fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
                color: 'grey.900',
                mb: 2.5,
                lineHeight: 1.2,
              }}
            >
              Powerful Tools for
              <Box component="span" sx={{ display: 'block', color: '#6366f1', mt: 0.5 }}>
                Smart Investing
              </Box>
            </Typography>
            
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ 
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.8,
                maxWidth: 680,
                mx: 'auto',
              }}
            >
              Everything you need to track, analyze, and optimize your investment portfolio in one comprehensive platform. Built for serious investors who demand precision and insights.
            </Typography>
          </Box>
        </motion.div>

        {/* Main Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          <Grid container spacing={{ xs: 3, md: 4 }} sx={{ mb: { xs: 6, md: 8 } }}>
            {mainFeatures.map((feature, index) => (
              <Grid item xs={12} md={4} key={feature.title}>
                <MainFeatureCard {...feature} index={index} />
              </Grid>
            ))}
          </Grid>
        </motion.div>

        {/* Divider */}
        <Box 
          sx={{ 
            height: 1, 
            background: 'linear-gradient(90deg, transparent, #e5e7eb, transparent)',
            my: { xs: 6, md: 8 }
          }} 
        />

        {/* Additional Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          viewport={{ once: true }}
        >
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 800,
                fontSize: { xs: '1.5rem', md: '1.875rem' },
                color: 'grey.900',
                mb: 1.5,
              }}
            >
              And Much More
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: '0.9375rem' }}
            >
              Additional features to enhance your investment tracking experience
            </Typography>
          </Box>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            <Grid container spacing={{ xs: 2.5, md: 3 }}>
              {additionalFeatures.map((feature) => (
                <Grid item xs={12} sm={6} key={feature.title}>
                  <AdditionalFeatureCard {...feature} />
                </Grid>
              ))}
            </Grid>
          </motion.div>
        </motion.div>
      </Container>
    </Box>
  );
};

export default FeaturesSection;