// client/src/App.jsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Box, CircularProgress, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { theme as landingTheme } from './theme'; // Your existing Landing Page theme
import { adminTheme } from './adminTheme'; // Your new Admin theme
import { investorTheme } from './investorTheme'; // <-- 1. Import new theme

// --- Lazy load pages ---
const Layout = React.lazy(() => import('./components/Layout'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const AdminUserManagement = React.lazy(() => import('./pages/AdminUserManagement'));

// --- UPDATED LAZY LOAD ---
// Renamed InvestorDashboard -> OverallDashboard
// Added new PortfolioListPage
const OverallDashboard = React.lazy(() => import('./pages/OverallDashboard'));
const PortfolioListPage = React.lazy(() => import('./pages/PortfolioListPage'));
const PortfolioDetailPage = React.lazy(() => import('./pages/PortfolioDetailPage'));
const LandingPage = React.lazy(() => import('./pages/LandingPage'));


export const getAuth = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return { isAuthenticated: false, user: null };
  }
  try {
    const decoded = jwtDecode(token);
    if (!decoded.user) {
      localStorage.removeItem('token');
      return { isAuthenticated: false, user: null };
    }
    return { isAuthenticated: true, user: decoded.user };
  } catch (error) {
    console.error('Invalid token:', error);
    localStorage.removeItem('token');
    return { isAuthenticated: false, user: null };
  }
};

/**
 * A layout component to protect routes based on role
 * AND apply the correct theme.
 */
const ProtectedRoute = ({ role }) => {
  const { isAuthenticated, user } = getAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    const homeRoute = user.role === 'admin' ? '/admin-dashboard' : '/dashboard';
    return <Navigate to={homeRoute} replace />;
  }

  // --- 2. APPLY THE NEW INVESTOR THEME ---
  const theme = role === 'admin' ? adminTheme : investorTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* 3. Apply CssBaseline here */}
      <Layout>
        <Outlet />
      </Layout>
    </ThemeProvider>
  );
};

// Fallback for React.lazy
const SuspenseFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  const { isAuthenticated } = getAuth();

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* --- Public Routes (use Landing Page Theme) --- */}
        <Route
          element={
            <ThemeProvider theme={landingTheme}>
              <CssBaseline /> {/* 3. Apply CssBaseline here */}
              <Outlet />
            </ThemeProvider>
          }
        >
          <Route
            path="/"
            element={!isAuthenticated ? <LandingPage /> : <Navigate to={getAuth().user.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />}
          />
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <RegisterPage /> : <Navigate to="/" replace />}
          />
        </Route>

        {/* --- Admin Protected Routes (uses adminTheme via ProtectedRoute) --- */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/admin-users" element={<AdminUserManagement />} />
        </Route>

        {/* --- Investor Protected Routes (uses investorTheme via ProtectedRoute) --- */}
        <Route element={<ProtectedRoute role="investor" />}>
          <Route path="/dashboard" element={<OverallDashboard />} />
          <Route path="/portfolios" element={<PortfolioListPage />} />
          <Route path="/portfolio/:id" element={<PortfolioDetailPage />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;