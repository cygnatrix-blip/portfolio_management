import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

// Import all page components
import AdminDashboard from './pages/AdminDashboard';
import ClientDetailPage from './pages/ClientDetailPage';
import LoginPage from './pages/LoginPage';
import ClientDashboard from './pages/ClientDashboard';
import RegisterPage from './pages/RegisterPage';
import AssetTransactionsPage from './pages/AssetTransactionsPage';
import Layout from './components/Layout';
import AdminActionsPage from './pages/AdminActionsPage';
import ClientsPage from './pages/ClientsPage';
import ClientTransactionsPage from './pages/ClientTransactionsPage';

function App() {
  // useEffect for Lenis scroll can remain if you're using it
  // ...

  const token = localStorage.getItem('token');
  let isAdmin = false;
  let isAuthenticated = false;

  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      isAdmin = decodedToken.client.role === 'admin';
      isAuthenticated = true;
    } catch (error) {
      console.error('Invalid token:', error);
      localStorage.removeItem('token');
    }
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        // Protected routes are nested inside the Layout route
        <Route element={<Layout />}>
          {isAdmin ? (
            <>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/client/:clientId" element={<ClientDetailPage />} />
              <Route path="/transactions" element={<AssetTransactionsPage />} />
              <Route path="/admin-actions" element={<AdminActionsPage />} />
            </>
          ) : (
            <>
              <Route path="/" element={<ClientDashboard />} />
              <Route path="/transactions" element={<ClientTransactionsPage />} />
            </>
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}

export default App;