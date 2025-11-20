// client/src/pages/landing/Footer.jsx
import React from 'react';
import { Box, Container, Grid, Link, Typography, Button, Stack, Divider, IconButton } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmailIcon from '@mui/icons-material/Email';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import TwitterIcon from '@mui/icons-material/Twitter';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'Dashboard', to: '/login' },
        { label: 'Portfolio Analytics', href: '#analytics' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '#about' },
        { label: 'Contact', href: '#contact' },
        { label: 'Careers', href: '#careers' },
        { label: 'Blog', href: '#blog' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '#privacy' },
        { label: 'Terms of Service', href: '#terms' },
        { label: 'Cookie Policy', href: '#cookies' },
        { label: 'Disclaimer', href: '#disclaimer' },
      ],
    },
  ];

  const socialLinks = [
    { icon: <LinkedInIcon />, href: '#', label: 'LinkedIn' },
    { icon: <TwitterIcon />, href: '#', label: 'Twitter' },
    { icon: <GitHubIcon />, href: '#', label: 'GitHub' },
    { icon: <EmailIcon />, href: 'mailto:support@zupeon.com', label: 'Email' },
  ];

  return (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.5), transparent)',
        },
      }}
    >
      {/* Animated background elements */}
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
        sx={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.15), transparent)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Main Footer Content */}
        <Box
          component={motion.div}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          sx={{ py: { xs: 6, md: 10 } }}
        >
          <Grid container spacing={{ xs: 4, md: 6 }}>
            {/* Brand Section */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Stack spacing={3}>
                  {/* Logo */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 50,
                        height: 50,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      <TrendingUpIcon sx={{ fontSize: 30, color: 'white' }} />
                    </Box>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      PortfolioManager
                    </Typography>
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      lineHeight: 1.8,
                      maxWidth: '350px',
                    }}
                  >
                    Your complete solution for managing personal investments in the Indian market.
                    Track, analyze, and optimize your portfolio with powerful analytics.
                  </Typography>

                  {/* Contact Info */}
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <EmailIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        support@zupeon.com
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PhoneIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        +91 1800-XXX-XXXX
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'start', gap: 1.5 }}>
                      <LocationOnIcon sx={{ fontSize: 18, color: 'rgba(255, 255, 255, 0.5)', mt: 0.3 }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        Mumbai, India
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Social Links */}
                  <Stack direction="row" spacing={1}>
                    {socialLinks.map((social, index) => (
                      <motion.div
                        key={social.label}
                        whileHover={{ scale: 1.1, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <IconButton
                          href={social.href}
                          aria-label={social.label}
                          sx={{
                            color: 'rgba(255, 255, 255, 0.7)',
                            bgcolor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                              bgcolor: 'rgba(102, 126, 234, 0.2)',
                              color: '#667eea',
                              borderColor: '#667eea',
                            },
                            transition: 'all 0.3s ease',
                          }}
                        >
                          {social.icon}
                        </IconButton>
                      </motion.div>
                    ))}
                  </Stack>
                </Stack>
              </motion.div>
            </Grid>

            {/* Links Sections */}
            {footerLinks.map((section, sectionIndex) => (
              <Grid item xs={6} sm={4} md={2.66} key={section.title}>
                <motion.div variants={itemVariants}>
                  <Stack spacing={2}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        mb: 1,
                        color: 'white',
                      }}
                    >
                      {section.title}
                    </Typography>
                    <Stack spacing={1.5}>
                      {section.links.map((link, linkIndex) => (
                        <Link
                          key={linkIndex}
                          component={link.to ? RouterLink : 'a'}
                          to={link.to}
                          href={link.href}
                          underline="none"
                          sx={{
                            color: 'rgba(255, 255, 255, 0.65)',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              color: '#667eea',
                              transform: 'translateX(4px)',
                              '& .arrow-icon': {
                                opacity: 1,
                                transform: 'translateX(0)',
                              },
                            },
                          }}
                        >
                          {link.label}
                          <ArrowForwardIcon
                            className="arrow-icon"
                            sx={{
                              fontSize: 14,
                              opacity: 0,
                              transform: 'translateX(-5px)',
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </Link>
                      ))}
                    </Stack>
                  </Stack>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* CTA Section */}
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                mt: { xs: 6, md: 8 },
                p: { xs: 3, md: 4 },
                borderRadius: 3,
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mb: 1,
                      fontSize: { xs: '1.25rem', md: '1.5rem' },
                    }}
                  >
                    Ready to take control of your investments?
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: { xs: '0.875rem', md: '1rem' },
                    }}
                  >
                    Join thousands of investors managing their portfolios with confidence.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent={{ md: 'flex-end' }}>
                    <Button
                      component={RouterLink}
                      to="/register"
                      variant="contained"
                      size="large"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        bgcolor: 'white',
                        color: '#667eea',
                        fontWeight: 700,
                        px: 3,
                        py: 1.5,
                        boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.95)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(255, 255, 255, 0.3)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Get Started
                    </Button>
                    <Button
                      component={RouterLink}
                      to="/login"
                      variant="outlined"
                      size="large"
                      sx={{
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: 'white',
                        fontWeight: 600,
                        px: 3,
                        py: 1.5,
                        borderWidth: 2,
                        '&:hover': {
                          borderColor: 'white',
                          borderWidth: 2,
                          bgcolor: 'rgba(255, 255, 255, 0.1)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      Sign In
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </motion.div>
        </Box>

        {/* Bottom Bar */}
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        <Box
          sx={{
            py: 4,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.875rem',
              textAlign: { xs: 'center', sm: 'left' },
            }}
          >
            © {currentYear} Zupeon. All rights reserved. Made with ❤️ in India
          </Typography>
          <Stack
            direction="row"
            spacing={3}
            divider={<Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.2)' }} />}
          >
            <Link
              href="#"
              underline="none"
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                '&:hover': { color: '#667eea' },
                transition: 'color 0.3s ease',
              }}
            >
              Privacy
            </Link>
            <Link
              href="#"
              underline="none"
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                '&:hover': { color: '#667eea' },
                transition: 'color 0.3s ease',
              }}
            >
              Terms
            </Link>
            <Link
              href="#"
              underline="none"
              sx={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '0.875rem',
                '&:hover': { color: '#667eea' },
                transition: 'color 0.3s ease',
              }}
            >
              Cookies
            </Link>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;