import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Menu,
  MenuItem,
  Avatar,
  Stack,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MovieIcon from '@mui/icons-material/MovieFilter';
import LogoutIcon from '@mui/icons-material/Logout';
import { alpha } from '@mui/material/styles';

import { useAuth } from '../../contexts/AuthContext';
import theme from '../../theme';
import { menuItemStyles, userButtonStyles } from './styles';

interface User {
  name?: string;
  avatar?: string;
}

interface UserMenuProps {
  user: User | null;
}

const UserMenu: React.FC<UserMenuProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      handleMenuClose();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  return (
    <>
      <Button
        onClick={handleMenuOpen}
        color="inherit"
        endIcon={<KeyboardArrowDownIcon fontSize="small" />}
        sx={userButtonStyles}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar
            sx={{
              width: 28,
              height: 28,
              bgcolor: theme.palette.primary.main,
              color: 'black',
              fontSize: '0.85rem',
              fontWeight: 600,
              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.2)',
              border: `1px solid ${alpha(theme.palette.primary.light, 0.8)}`
            }}
          >
            {user?.avatar || (user?.name ? user.name.charAt(0).toUpperCase() : 'U')}
          </Avatar>
          <Typography 
            sx={{ 
              fontWeight: 500,
              fontSize: '0.85rem'
            }}
          >
            {user?.name || 'User'}
          </Typography>
        </Stack>
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 4,
          sx: {
            mt: 0.5,
            borderRadius: 2,
            minWidth: '180px',
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
            bgcolor: theme.palette.secondary.light,
            color: 'white',
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: theme.palette.secondary.light,
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          }
        }}
        MenuListProps={{
          sx: { py: 0.5 }
        }}
      >
        {/* Dashboard option */}
        <MenuItem
          onClick={() => handleNavigate('/')}
          sx={{
            ...menuItemStyles,
            backgroundColor: location.pathname === '/' 
              ? alpha(theme.palette.primary.main, 0.1) 
              : 'transparent',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <DashboardIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: location.pathname === '/' ? 500 : 400,
                color: 'white'
              }}
            >
              Dashboard
            </Typography>
          </Stack>
        </MenuItem>
        
        {/* Rate Movies option */}
        <MenuItem
          onClick={() => handleNavigate('/movies')}
          sx={{
            ...menuItemStyles,
            backgroundColor: location.pathname === '/movies' 
              ? alpha(theme.palette.primary.main, 0.1) 
              : 'transparent',
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MovieIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: location.pathname === '/movies' ? 500 : 400,
                color: 'white'
              }}
            >
              Rate Movies
            </Typography>
          </Stack>
        </MenuItem>
        
        <Divider sx={{ my: 0.5, borderColor: alpha('#FFFFFF', 0.1) }} />
        
        {/* Logout option */}
        <MenuItem
          onClick={handleLogout}
          disabled={isLoggingOut}
          sx={{
            py: 0.75,
            px: 2,
            minHeight: '40px',
            '&:hover': {
              backgroundColor: alpha(theme.palette.error.main, 0.1)
            },
            opacity: isLoggingOut ? 0.7 : 1,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isLoggingOut ? (
              <CircularProgress size={16} sx={{ color: alpha(theme.palette.error.main, 0.9), ml: 0.25, mr: 0.25 }} />
            ) : (
              <LogoutIcon sx={{ fontSize: 20, color: alpha(theme.palette.error.main, 0.9) }} />
            )}
            <Typography
              sx={{
                fontSize: '0.85rem',
                fontWeight: 400,
                color: alpha(theme.palette.error.main, 0.9)
              }}
            >
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </>
  );
};

export default UserMenu;