import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Paper,
  Box,
  Container,
  Grid,
  Button
} from '@mui/material';
import {
  Movie as MovieIcon,
  People as PeopleIcon,
  Compare as CompareIcon
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
 
  const handleNavigate = (path: string) => {
    navigate(path);
  };
 
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {currentUser?.name || currentUser?.email}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's your personalized dashboard. Explore movies, rate them, and connect with friends!
        </Typography>
      </Paper>
     
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        What would you like to do today?
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{xs:12, md:4}}>
          <Button 
            //variant="outlined" 
            color="primary"
            fullWidth
            size="large"
            sx={{ 
              height: 120, 
              display: 'flex', 
              flexDirection: 'column',
              textTransform: 'none',
            }}
            onClick={() => handleNavigate('/movies')}
          >
            <MovieIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Movies</Typography>
          </Button>
        </Grid>
        
        <Grid size={{xs:12, md:4}}>
          <Button 
            //variant="contained" 
            color="primary"
            fullWidth
            size="large"
            sx={{ 
              height: 120, 
              display: 'flex', 
              flexDirection: 'column',
              textTransform: 'none'
            }}
            onClick={() => handleNavigate('/friends')}
          >
            <PeopleIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Friends</Typography>
          </Button>
        </Grid>
        
        <Grid size={{xs:12, md:4}}>
          <Button 
            //variant="contained" 
            color="primary"
            fullWidth
            size="large"
            sx={{ 
              height: 120, 
              display: 'flex', 
              flexDirection: 'column',
              textTransform: 'none'
            }}
            onClick={() => handleNavigate('/comparison')}
          >
            <CompareIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6">Comparisons</Typography>
          </Button>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Activity Overview
          </Typography>
          <Typography variant="body1">
            Welcome to your movie social network! Use the buttons above to:
          </Typography>
          <Box component="ul" sx={{ mt: 2 }}>
            <Typography component="li">
              Discover and rate new movies in the Movies section
            </Typography>
            <Typography component="li">
              Connect with friends and share your movie tastes in the Friends section
            </Typography>
            <Typography component="li">
              Compare your movie ratings with friends in the Comparisons section
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Dashboard;