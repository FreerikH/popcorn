// src/pages/LoginPage.tsx
import { /*useState, */ useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Button,
  Grid,
  useTheme,
  alpha
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import MovieIcon from '@mui/icons-material/MovieFilter';
import StarIcon from '@mui/icons-material/Star';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  
  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated && !loading) {
      const state = location.state as LocationState;
      const from = state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, location]);

  // Handle login button click
  const handleLoginClick = () => {
    // The login action will be handled by the Navbar component's modal
    // Just trigger the navbar login modal by simulating a click on its button
    const loginButton = document.querySelector('[data-testid="login-button"]') as HTMLElement;
    if (loginButton) {
      loginButton.click();
    } else {
      console.error('Login button not found in navbar');
    }
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 50px)', // Subtract navbar height
      width: '100%',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      bgcolor: theme.palette.secondary.main,
      p: 2,
      overflow: 'auto'
    }}>
      <Container maxWidth="md">
        <Grid container spacing={4} alignItems="center">
          {/* Left side - Welcome message */}
          <Grid size={6}>
            <Box sx={{ color: 'white', mb: { xs: 4, md: 0 } }}>
              <Typography 
                variant="h3" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.primary.main,
                  mb: 2
                }}
              >
                Discover your next favorite movie
              </Typography>
              
              <Typography variant="body1" paragraph sx={{ mb: 3, fontSize: '1.1rem' }}>
                Popcorn helps you find movies you'll love by letting you 
                quickly swipe through curated suggestions based on your taste.
              </Typography>
              
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MovieIcon sx={{ color: theme.palette.primary.main, mr: 1.5 }} />
                  <Typography variant="body1">
                    Rate movies with a simple yes/no/maybe system
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StarIcon sx={{ color: theme.palette.primary.main, mr: 1.5 }} />
                  <Typography variant="body1">
                    Get personalized recommendations based on your preferences
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ThumbUpIcon sx={{ color: theme.palette.primary.main, mr: 1.5 }} />
                  <Typography variant="body1">
                    Build your watchlist and keep track of what you've seen
                  </Typography>
                </Box>
              </Box>
              
              <Button
                variant="contained"
                size="large"
                onClick={handleLoginClick}
                sx={{ 
                  borderRadius: 2,
                  py: 1.5,
                  px: 3,
                  fontSize: '1rem',
                  fontWeight: 600,
                  bgcolor: theme.palette.primary.main,
                  color: 'black',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  }
                }}
              >
                Get Started
              </Button>
            </Box>
          </Grid>
          
          {/* Right side - Movie collage or illustration */}
          <Grid size={6}>
            <Paper 
              elevation={8}
              sx={{ 
                borderRadius: 4,
                overflow: 'hidden',
                height: { xs: '300px', md: '400px' },
                backgroundImage: 'url(/src/assets/movie-collage.jpg)', // Replace with your image
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`
              }}
            />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LoginPage;