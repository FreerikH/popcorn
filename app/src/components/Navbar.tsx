import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Avatar,
  Collapse,
  Container,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { 
  PeopleOutline,
  ExitToApp as LogoutIcon,
  Movie as MovieIcon,
  Compare as CompareIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const Navbar: React.FC = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('md'));
  
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Ensure navbar dropdown is on top of other content
  React.useEffect(() => {
    // Add overflow: hidden to body when dropdown is open to prevent scrolling
    if (dropdownOpen && !isLargeScreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [dropdownOpen, isLargeScreen]);
  
  const toggleDropdown = () => {
    if (!isLargeScreen) {
      setDropdownOpen(!dropdownOpen);
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  const navigateTo = (path: string) => {
    setDropdownOpen(false);
    navigate(path);
  };

  return (
    <>
      <AppBar 
        position="sticky" 
        sx={{
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.primary.main,
          boxShadow: dropdownOpen ? 'none' : undefined,
          borderBottom: dropdownOpen ? `1px solid ${theme.palette.divider}` : 'none',
          transition: 'box-shadow 0.3s ease',
          zIndex: 1200
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters>
            {/* Logo/Brand - make it clickable but don't toggle dropdown */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1,
                }}
              >
                <Box
                  component="img"
                  src="/icon_black.png"
                  alt="Popcorn Logo"
                  sx={{
                    width: 50,
                    height: 50,
                    objectFit: 'cover',
                  }}
                />
              </Box>
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                }}
              >
                <Typography
                  variant="subtitle1"
                  component="div"
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    lineHeight: 1.1,
                    fontSize: '1.1rem'
                  }}
                >
                  Popcorn
                </Typography>
                <Typography
                  variant="caption"
                  component="div"
                  sx={{
                    fontWeight: 400,
                    color: theme.palette.primary.main,
                    fontSize: '0.7rem',
                    letterSpacing: '0.5px',
                    lineHeight: 1,
                  }}
                >
                  no<span style={{ color: 'secondary' }}>w</span> you pick
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexGrow: 1 }}></Box>

            {/* Navigation items for large screens */}
            {isAuthenticated && isLargeScreen && (
              <Box sx={{ display: 'flex', gap: 2, mr: 3 }}>
                <Button
                  color="primary"
                  startIcon={<MovieIcon />}
                  onClick={() => navigateTo('/movies')}
                  sx={{ textTransform: 'none' }}
                >
                  Movies
                </Button>
                
                <Button
                  color="primary"
                  startIcon={<PeopleOutline />}
                  onClick={() => navigateTo('/friends')}
                  sx={{ textTransform: 'none' }}
                >
                  Friends
                </Button>
                
                <Button
                  color="primary"
                  startIcon={<CompareIcon />}
                  onClick={() => navigateTo('/comparison')}
                  sx={{ textTransform: 'none' }}
                >
                  Comparison
                </Button>
                
                <Button
                  color="primary"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  sx={{ textTransform: 'none' }}
                >
                  Logout
                </Button>
              </Box>
            )}

            {/* Auth Section */}
            {isAuthenticated && (
              <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 1 }}
                >
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography
                  sx={{ 
                    ml: 1, 
                    textTransform: 'none',
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  {currentUser?.name}
                </Typography>
              </Box>
            )}

            {/* Menu button for small screens */}
            {isAuthenticated && !isLargeScreen && (
              <IconButton
                color="primary"
                onClick={toggleDropdown}
                sx={{ ml: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      
      {/* Full-width dropdown for small screens */}
      <Collapse in={dropdownOpen && !isLargeScreen} timeout="auto">
        <Box 
          sx={{ 
            position: 'absolute',
            zIndex: 1100,
            width: '100%', 
            backgroundColor: theme.palette.background.paper,
            borderColor: theme.palette.background.default,
            borderBottom: `1px solid ${theme.palette.divider}`,
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Container maxWidth="xl">
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
                py: 2,
                gap: 1,
              }}
            >
              <Button
                color="primary"
                startIcon={<MovieIcon />}
                onClick={() => navigateTo('/movies')}
                sx={{ textTransform: 'none' }}
                fullWidth
              >
                Movies
              </Button>
              
              <Button
                color="primary"
                startIcon={<PeopleOutline />}
                onClick={() => navigateTo('/friends')}
                sx={{ textTransform: 'none' }}
                fullWidth
              >
                Friends
              </Button>
              
              <Button
                color="primary"
                startIcon={<CompareIcon />}
                onClick={() => navigateTo('/comparison')}
                sx={{ textTransform: 'none' }}
                fullWidth
              >
                Comparison
              </Button>
              
              <Button
                color="primary"
                startIcon={<LogoutIcon />}
                onClick={handleLogout}
                sx={{ textTransform: 'none' }}
                fullWidth
              >
                Logout
              </Button>
            </Box>
          </Container>
        </Box>
      </Collapse>
    </>
  );
};

export default Navbar;