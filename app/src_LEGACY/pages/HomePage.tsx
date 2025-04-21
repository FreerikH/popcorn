// src/pages/HomePage.tsx
import { 
  Box
} from '@mui/material';

import {useAuth} from '../contexts/AuthContext'


const HomePage = () => {
  const { user, isAuthenticated } = useAuth();
  return (
    <Box sx={{ 
      height: 'calc(100vh - 50px)', // Subtract navbar height
      width: '100%',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 2,
      overflow: 'auto'
    }}>
      HomePage - 
      Moin{isAuthenticated ? ' ' + user?.name.split(' ')[0] : ''},
    </Box>
  );
};

export default HomePage;