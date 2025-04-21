//import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FriendsManagement from '../components/FriendsManagement';
//import Dashboard from './Dashboard';
import { Container, } from '@mui/material';

const FriendsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Container sx={{border:'1px solid green', height: '100%'}}>
      {isAuthenticated ? (
        <FriendsManagement />
      ) : (
        ''
      )}
    </Container>
  );
};

export default FriendsPage;