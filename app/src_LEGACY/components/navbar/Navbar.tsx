import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, CircularProgress, Button } from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { alpha } from '@mui/material/styles';

//import { SxProps, Theme } from '@mui/material/styles';
import theme from '../../theme';

// Import components
import Logo from './Logo';
import UserMenu from './UserMenu';
import AuthDialog from './AuthDialog';

// Import contexts and styles
import { useAuth } from '../../contexts/AuthContext';
//import { appBarStyles, loginButtonStyles } from './styles';

// Main Navbar component
const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  
  // Auth dialog state
  const [authDialogOpen, setAuthDialogOpen] = React.useState<boolean>(false);
  const [isLoginMode, setIsLoginMode] = React.useState<boolean>(true);
  
  const handleOpenAuthDialog = () => {
    setAuthDialogOpen(true);
    setIsLoginMode(true);
  };
  
  const handleCloseAuthDialog = () => {
    setAuthDialogOpen(false);
  };
  
  const toggleAuthMode = () => {
    setIsLoginMode(!isLoginMode);
  };

  return (
    <AppBar position="sticky" sx={{
      backgroundColor: theme.palette.secondary.main,
      color: 'white',
      boxShadow: 'none',
      borderTop: '2px solid',
      borderTopColor: theme.palette.primary.main,
      height: '50px',
    }}>
      <Toolbar variant="dense" sx={{ minHeight: '50px', px: 2 }}>
        {/* Logo */}
        <Logo onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')} />
        
        {/* Authentication UI */}
        {loading ? (
          <CircularProgress size={24} sx={{ color: 'primary.main' }} />
        ) : isAuthenticated ? (
          <UserMenu user={user} />
        ) : (
          <Button
            onClick={handleOpenAuthDialog}
            color="inherit"
            startIcon={<AccountCircleIcon />}
            data-testid="login-button"
            sx={{
              textTransform: 'none',
              borderRadius: 0,
              padding: '4px 12px',
              backgroundColor: alpha(theme.palette.primary.main, 0.2),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.3)
              },
              transition: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Login
          </Button>
        )}
      </Toolbar>
      
      {/* Authentication Dialog */}
      <AuthDialog 
        open={authDialogOpen}
        onClose={handleCloseAuthDialog}
        isLoginMode={isLoginMode}
        toggleAuthMode={toggleAuthMode}
      />
    </AppBar>
  );
};

export default Navbar;