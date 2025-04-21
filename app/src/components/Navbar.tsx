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
  Menu,
  MenuItem,
  Container,
} from '@mui/material';
import { 
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

const Navbar: React.FC = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  // Profile menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    logout();
    navigate('/');
  };

  const navigateToHome = () => {
    navigate('/');
  };

  return (
    <AppBar position="sticky" sx={{
      backgroundColor: theme.palette.background.default,
      color: theme.palette.primary.main
      }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Logo/Brand - now clickable */}
          <Box
            sx={{
              width: 32,
              height: 32,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 1,
              cursor: 'pointer'
            }}
            onClick={navigateToHome}
          >
            <Box
              component="img"
              src="/src/icon_black.png"
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
              cursor: 'pointer' 
            }}
            onClick={navigateToHome}
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

          <Box sx={{ display: 'flex', flexGrow: 1 }}></Box>

          {/* Auth Section */}
          <Box sx={{ flexGrow: 0 }}>
            {isAuthenticated ? (
              <>
                <Button
                  onClick={handleProfileMenuOpen}
                  color="inherit"
                  startIcon={
                    <Avatar
                      sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius:1 }}
                    >
                      {currentUser?.name?.charAt(0).toUpperCase()}
                    </Avatar>
                  }
                  sx={{ textTransform: 'none' }}
                >
                  {currentUser?.name}
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleProfileMenuClose}
                  onClick={handleProfileMenuClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              ''
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;