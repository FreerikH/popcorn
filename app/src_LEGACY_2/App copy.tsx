import React, { /*useEffect*/ } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container, Box } from '@mui/material';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext'; // Import the new ApiProvider
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import MovieRatingPage from './pages/MovieRatingPage';
import FriendsPage from './pages/FriendsPage';
import ComparisonPage from './pages/ComparisonPage';

import theme from './theme'

// Protected route component
interface ProtectedRouteProps {
  element: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{element}</> : <Navigate to="/" />;
};

const containerHeight = 'calc(var(--vh, 1vh) * 100 - 0px)';

const App: React.FC = () => {
  /*useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVh(); // Set on mount
    window.addEventListener('resize', setVh); // Update on resize

    return () => window.removeEventListener('resize', setVh);
  }, []); */

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ApiProvider> {/* Wrap your app with ApiProvider */}
          <Router>
            <Container maxWidth={'md'} sx={{ 
              //overflow: 'hidden', 
              height: containerHeight, 
              border:'1px solid red',
              px: 0,
            }}>
              <Navbar />
              <Box component="main">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/movies" element={<ProtectedRoute element={<MovieRatingPage />} />} />
                  {/*<Route path="/settings" element={<ProtectedRoute element={<SettingsPage />} />} /> */}
                  <Route path="/friends" element={<ProtectedRoute element={<FriendsPage />} />} />
                  <Route path="/comparison" element={<ProtectedRoute element={<ComparisonPage />} />} />
                </Routes>
              </Box>
            </Container>
          </Router>
        </ApiProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;