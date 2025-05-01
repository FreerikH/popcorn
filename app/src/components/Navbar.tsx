import { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { 
  Movie as MovieIcon, 
  CompareArrows as CompareIcon, 
  AccountCircle, 
  People as FriendsIcon, 
  Settings as SettingsIcon, 
  Logout as LogoutIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';

const Navbar = ({ height = 48}) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const isLoggedIn = isAuthenticated;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  
  // For user menu
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  
  // For mobile menu
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const mobileMenuOpen = Boolean(mobileMenuAnchor);

  const handleProfileMenuOpen = (event:any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleMobileMenuOpen = (event:any) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const isActive = (path:string) => {
    return location.pathname === path;
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    handleMenuClose();
    handleMobileMenuClose();
    navigate('/'); // Redirect to welcome/home page
  };

  // Navigation items
  const navItems = [
    { name: 'Movies', path: '/movies', icon: <MovieIcon /> },
    { name: 'Comparison', path: '/comparison', icon: <CompareIcon /> }
  ];

  // User menu items
  const userMenuItems = [
    { name: 'Friends', path: '/friends', icon: <FriendsIcon /> },
    { name: 'Settings', path: '/settings', icon: <SettingsIcon /> }
  ];

  return (
    <AppBar position="static" sx={{ height: height || 48, boxShadow: 1 }}>
      <Toolbar variant="dense" sx={{ justifyContent: 'space-between', height: '100%', minHeight: 'unset' }}>
        {/* Logo and Brand name */}
        <Box 
          component={Link} 
          to="/" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            textDecoration: 'none', 
            color: 'inherit' 
          }}
        >
          <MovieIcon sx={{ mr: 0.5, fontSize: '1.2rem' }} />
          <Typography variant="subtitle1" component="div" sx={{ fontWeight: 'bold' }}>
            MovieApp
          </Typography>
        </Box>

        {/* Desktop Navigation */}
        {!isMobile ? (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Navigation links - only show when logged in */}
            {isLoggedIn && (
              <Box sx={{ display: 'flex', mx: 2 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.name}
                    component={Link}
                    to={item.path}
                    color="inherit"
                    size="small"
                    sx={{ 
                      mx: 1,
                      borderBottom: isActive(item.path) ? '2px solid white' : 'none',
                      borderRadius: 0,
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                    startIcon={item.icon}
                  >
                    {item.name}
                  </Button>
                ))}
              </Box>
            )}

            {/* User Profile Icon - only if logged in */}
            {isLoggedIn && (
              <Box>
                <IconButton
                  size="small"
                  edge="end"
                  color="inherit"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleProfileMenuOpen}
                >
                  <AccountCircle />
                </IconButton>

                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleMenuClose}
                  PaperProps={{
                    elevation: 3,
                    sx: { 
                      minWidth: 180,
                      mt: 1
                    }
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  {/* Regular user menu items */}
                  {userMenuItems.map((item) => (
                    <MenuItem 
                      key={item.name} 
                      component={Link} 
                      to={item.path}
                      onClick={handleMenuClose}
                      dense
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText>{item.name}</ListItemText>
                    </MenuItem>
                  ))}
                  
                  {/* Logout menu item */}
                  <MenuItem 
                    onClick={handleLogout}
                    dense
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Box>
        ) : (
          /* Mobile menu icon */
          <Box>
            <IconButton
              size="small"
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={handleMobileMenuOpen}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
            
            <Menu
              id="mobile-menu"
              anchorEl={mobileMenuAnchor}
              open={mobileMenuOpen}
              onClose={handleMobileMenuClose}
              PaperProps={{
                elevation: 3,
                sx: { minWidth: 180 }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {/* Navigation Items - only when logged in */}
              {isLoggedIn && navItems.map((item) => (
                <MenuItem 
                  key={item.name} 
                  component={Link} 
                  to={item.path}
                  onClick={handleMobileMenuClose}
                  selected={isActive(item.path)}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText>{item.name}</ListItemText>
                </MenuItem>
              ))}
              
              {/* Regular user menu items */}
              {isLoggedIn && userMenuItems.map((item) => (
                <MenuItem 
                  key={item.name} 
                  component={Link} 
                  to={item.path}
                  onClick={handleMobileMenuClose}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText>{item.name}</ListItemText>
                </MenuItem>
              ))}
              
              {/* Logout menu item */}
              {isLoggedIn && (
                <MenuItem 
                  onClick={handleLogout}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LogoutIcon />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;