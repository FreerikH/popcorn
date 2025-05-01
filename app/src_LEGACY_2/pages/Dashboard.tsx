import React from 'react';
//import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  //Paper,
  //Container,
  Grid,
  Button
} from '@mui/material';
import {
  Movie as MovieIcon,
  People as PeopleIcon,
  Compare as CompareIcon
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  //const { currentUser } = useAuth();
  const navigate = useNavigate();
 
  const handleNavigate = (path: string) => {
    navigate(path);
  };
 
  return (        
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
  );
};

export default Dashboard;