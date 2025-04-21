import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import MovieExplorer from '../components/MovieExplorer';
import { Container } from '@mui/material';

const MovieRatingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [/*isMobile*/, setIsMobile] = useState(false);
  const [, setUserAgent] = useState('');

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor;
    setUserAgent(ua);
    setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(ua));
  }, []);

  // full heigh - 50px
  //const containerHeight = isMobile ? 'calc(100% - 50px)' : '100%';
  const containerHeight = 'calc(var(--vh, 1vh) * 100 - 50px)';

  return (
    <Container maxWidth="sm" sx={{ px: 0, height: containerHeight, overflowY: 'hidden' }}>
      {isAuthenticated && <MovieExplorer />}
    </Container>
  );
};

export default MovieRatingPage;
