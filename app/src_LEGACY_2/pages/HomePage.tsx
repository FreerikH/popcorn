import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import Dashboard from './Dashboard';
import { Box, Typography, Paper, Button, Stack, useTheme, useMediaQuery, Grid } from '@mui/material';

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState<boolean>(true);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  //const containerHeight = 'calc(var(--vh, 1vh) * 100 - 50px - 100px)';

  return (
    <Box sx={{border: '1px solid red' }}>
      {isAuthenticated ? (
        <Dashboard />
      ) : (
        <Box sx={{ my: 4 }}>
          {isSmallScreen ? (
            // Mobile/small screen layout
            <Box sx={{ mb: 4 }}>
              <Typography 
                component="h1" 
                variant="h3" 
                sx={{ 
                  mb: 1,
                  color: theme.palette.primary.main,
                  textAlign: 'center'
                }}
              >
                Welcome to MyApp
              </Typography>
              <Typography 
                variant="subtitle1" 
                color="text.secondary" 
                sx={{ mb: 3, textAlign: 'center' }}
              >
                Your all-in-one solution for managing your tasks
              </Typography>
            </Box>
          ) : null}
          
          <Grid container spacing={4}>
            {/* Left side - Title area - Hidden on small screens since it's shown above */}
            {!isSmallScreen && (
              <Grid size={{xs:12, md:5, lg:4}} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ pr: 2 }}>
                  <Typography 
                    component="h1" 
                    variant="h3" 
                    sx={{ 
                      mb: 2,
                      color: theme.palette.primary.main
                    }}
                  >
                    Welcome to MyApp
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Your all-in-one solution for managing your tasks
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 2 }}>
                    {showLoginForm 
                      ? 'Already have an account? Sign in to access your dashboard!' 
                      : 'New to MyApp? Create an account in just a few steps!'}
                  </Typography>
                </Box>
              </Grid>
            )}
            
            {/* Right side - Login/Registration area */}
            <Grid size={{xs:12, md:7, lg:8}}>
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 3,
                  borderRadius: 2,
                  bgcolor: 'background.paper'
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="center"
                  sx={{ mb: 3 }}
                >
                  <Button
                    variant={showLoginForm ? "contained" : "outlined"}
                    onClick={() => setShowLoginForm(true)}
                    size="large"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant={!showLoginForm ? "contained" : "outlined"}
                    onClick={() => setShowLoginForm(false)}
                    size="large"
                  >
                    Register
                  </Button>
                </Stack>
                
                {showLoginForm ? (
                  <LoginForm onLoginSuccess={() => {}} />
                ) : (
                  <RegisterForm
                    onRegisterSuccess={() => setShowLoginForm(true)}
                    onSwitchToLogin={() => setShowLoginForm(true)}
                  />
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default HomePage;