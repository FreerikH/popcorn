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
  IconButton,
  Menu,
  MenuItem,
  //Container
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

const Navbar: React.FC = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    handleMobileMenuClose();
    logout();
    navigate('/');
  };

  const navigateTo = (path: string) => {
    handleMobileMenuClose();
    handleProfileMenuClose();
    navigate(path);
  };

  // Common styles for menu items
  const menuItemStyle = {
    color: 'primary.main',
    '&:hover': {
      backgroundColor: 'rgba(25, 118, 210, 0.04)'
    }
  };

  return (
    <AppBar 
      position="sticky" 
      color="secondary" 
      elevation={1}
      sx={{ 
        width: '100%',
        left: 0,
        right: 0,
        border: '1px solid red'
      }}
    >
      <Toolbar sx={{ py: 0.5 }}>
        {/* Logo */}
        <Box 
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', ml: 2 }}
          onClick={() => navigate('/')}
        >
          <Box 
            component="img"
            src="/icon_black.png"
            alt="Popcorn Logo"
            sx={{ width: 36, height: 36, mr: 1 }}
          />
          <Typography variant="h6" color='primary' sx={{ fontWeight: 500 }}>
            Popcorn
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Desktop Nav Items */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          {isAuthenticated && (
            <>
              <Button color='primary' onClick={() => navigateTo('/movies')}>
                Movies
              </Button>
              <Button color='primary' onClick={() => navigateTo('/comparison')}>
                Comparison
              </Button>
            </>
          )}
        </Box>

        {/* User Profile Menu */}
        {isAuthenticated && (
          <Box sx={{ ml: 1, mr: 2 }}>
            <IconButton onClick={handleProfileMenuOpen} color="primary" size="small">
              <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                {currentUser?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={profileMenuAnchor}
              open={Boolean(profileMenuAnchor)}
              onClose={handleProfileMenuClose}
              keepMounted
              disableScrollLock={true}
            >
              <MenuItem disabled>
                <Typography variant="body2">{currentUser?.name}</Typography>
              </MenuItem>
              <MenuItem onClick={() => navigateTo('/friends')} sx={menuItemStyle}>
                Friends
              </MenuItem>
              <MenuItem onClick={() => navigateTo('/settings')} sx={menuItemStyle}>
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={menuItemStyle}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}

        {/* Mobile Nav Menu */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mr: 2 }}>
          {isAuthenticated && (
            <>
              <IconButton color="primary" onClick={handleMobileMenuOpen} size="small">
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={mobileMenuAnchor}
                open={Boolean(mobileMenuAnchor)}
                onClose={handleMobileMenuClose}
                keepMounted
              >
                <MenuItem onClick={() => navigateTo('/movies')} sx={menuItemStyle}>
                  Movies
                </MenuItem>
                <MenuItem onClick={() => navigateTo('/comparison')} sx={menuItemStyle}>
                  Comparison
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;