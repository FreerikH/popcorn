//import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import FriendMovieComparison from '../components/FriendMovieComparison';
//import Dashboard from './Dashboard';
import { Container, } from '@mui/material';

const ComparisonPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <Container sx={{border:'1px solid green', height: '100%'}}>
      {isAuthenticated ? (
        <FriendMovieComparison />
      ) : (
        ''
      )}
    </Container>
  );
};

export default ComparisonPage;