import React, { useState, useEffect } from 'react';
import MovieExplorer from '../components/MovieExplorer';

const MovieRatingPage: React.FC = () => {
  const [/*isMobile*/, setIsMobile] = useState(false);
  const [, setUserAgent] = useState('');

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor;
    setUserAgent(ua);
    setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(ua));
  }, []);


  return (
    <MovieExplorer />
  );
};

export default MovieRatingPage;
