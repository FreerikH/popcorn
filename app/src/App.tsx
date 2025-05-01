import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import Navbar from './components/Navbar';
import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import MovieRatingPage from './pages/MovieRatingPage';
import FriendsPage from './pages/FriendsPage';
import ComparisonPage from './pages/ComparisonPage';
import theme from './theme';

// Protected route component
interface ProtectedRouteProps {
  element: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{element}</> : <Navigate to="/" />;
};

const navbarHeight = 50;
const containerHeight = `calc(var(--vh, 1vh) * 100 - ${navbarHeight}px)`;

// Main layout component that uses the auth context
const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh(); // Set on mount
    window.addEventListener('resize', setVh); // Update on resize
    return () => window.removeEventListener('resize', setVh);
  }, []);

  return (
    <>
      <Navbar height={navbarHeight} />
      <Container
        maxWidth={'sm'}
        sx={{
          height: containerHeight,
          border: '1px solid red',
          px: { xs: 0 },
        }}
      >
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <WelcomePage />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<HomePage />} />} />
          <Route path="/movies" element={<ProtectedRoute element={<MovieRatingPage />} />} />
          <Route path="/friends" element={<ProtectedRoute element={<FriendsPage />} />} />
          <Route path="/comparison" element={<ProtectedRoute element={<ComparisonPage />} />} />
        </Routes>
      </Container>
    </>
  );
};

// Root App component that sets up providers
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ApiProvider>
          <Router>
            <AppLayout />
          </Router>
        </ApiProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;