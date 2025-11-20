// client/src/pages/LandingPage.jsx
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import Navbar from './landing/Navbar';
import HeroSection from './landing/HeroSection';
import FeaturesSection from './landing/FeaturesSection'; // <-- Import new section
import Footer from './landing/Footer'; // <-- Import new footer

// Placeholder for other sections
const PlaceholderSection = ({ title, id }) => (
  <Box id={id} sx={{ py: { xs: 8, md: 12 }, bgcolor: id === 'contact' ? '#fff' : 'background.default' }}>
    <Container maxWidth="lg">
      <Typography variant="h2" component="h2" gutterBottom textAlign="center">
        {title}
      </Typography>
      <Paper elevation={0} sx={{ p: 4, mt: 4, background: 'background.paper' }}>
        <Typography variant="h6" color="text.secondary" textAlign="center">
          More information about {title.toLowerCase()} will go here.
        </Typography>
      </Paper>
    </Container>
  </Box>
);

const LandingPage = () => {
  return (
    <Box sx={{ bgcolor: 'background.default' }}> {/* Use theme background */}
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection /> {/* <-- Use the new animated section */}
        <PlaceholderSection title="About Us" id="about" />
        <PlaceholderSection title="Contact Us" id="contact" />
      </main>
      <Footer /> {/* <-- Use the new professional footer */}
    </Box>
  );
};

export default LandingPage;