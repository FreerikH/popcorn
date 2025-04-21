//import React from 'react';

import { ThemeProvider } from '@mui/material';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import { ApiProvider } from './contexts/ApiContext';
import Navbar from './components/navbar/Navbar';
import HomePage from './pages/HomePage';
import MoviePage from './pages/MoviePage';

// Main App component
const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <AuthProvider>
      <ApiProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />}></Route>
            <Route path="/movies" element={<MoviePage />}></Route>
          </Routes>
        </BrowserRouter>
      </ApiProvider>
    </AuthProvider>
  </ThemeProvider>
);

export default App;