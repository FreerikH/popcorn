import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';

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

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ApiProvider> {/* Wrap your app with ApiProvider */}
          <Router>
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
              <Navbar />
              <Box component="main" sx={{ flexGrow: 1}}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/movies" element={<ProtectedRoute element={<MovieRatingPage />} />} />
                  <Route path="/friends" element={<ProtectedRoute element={<FriendsPage />} />} />
                  <Route path="/comparison" element={<ProtectedRoute element={<ComparisonPage />} />} />
                </Routes>
              </Box>
            </Box>
          </Router>
        </ApiProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;