import { useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import Lenis from '@studio-freight/lenis';

// Import all page components
import AdminHomePage from './pages/AdminHomePage';
import ClientDetailPage from './pages/ClientDetailPage';
import LoginPage from './pages/LoginPage';
import ClientDashboard from './pages/ClientDashboard';
import RegisterPage from './pages/RegisterPage'; // <-- 1. IMPORT the new Register Page

import AssetTransactionsPage from './pages/AssetTransactionsPage';

function App() {
  useEffect(() => {
    const lenis = new Lenis();
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const token = localStorage.getItem('token');
  let isAdmin = false;

  if (token) {
    try {
      const decodedToken = jwtDecode(token);
      isAdmin = decodedToken.client.role === 'admin';
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem('token');
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  // --- 2. THIS IS THE MAIN LOGIC CHANGE ---
  // We now have two different views: one for logged-in users and one for logged-out users.
  
  if (!token) {
    // If the user is logged out, they can only access the Login and Register pages.
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        {/* All other paths will default to the Login page */}
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  // If a token exists, the user is logged in and sees the main portal.
  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: 'auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/" style={{ textDecoration: 'none', color: 'black' }}>
          <h1>{isAdmin ? 'Admin Portal' : 'Client Portal'}</h1>
        </Link>
        <button 
          onClick={handleLogout} 
          style={{
            padding: '10px 20px', 
            cursor: 'pointer', 
            border: 'none', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            borderRadius: '5px'
          }}
        >
          Logout
        </button>
      </header>
      <hr style={{ margin: '20px 0' }} />

      <main>
        <Routes>
          {isAdmin ? (
            <>
              <Route path="/" element={<AdminHomePage />} />
              <Route path="/client/:clientId" element={<ClientDetailPage />} />
              <Route path="/transactions" element={<AssetTransactionsPage />} />
            </>
          ) : (
            <Route path="/" element={<ClientDashboard />} />
          )}
        </Routes>
      </main>
    </div>
  );
}

export default App;

