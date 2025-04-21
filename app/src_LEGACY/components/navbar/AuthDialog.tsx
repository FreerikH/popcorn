import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import { useAuth } from '../../contexts/AuthContext';
import theme from '../../theme';
import { dialogStyles, textFieldStyles, authButtonStyles } from './styles';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  isLoginMode: boolean;
  toggleAuthMode: () => void;
}

const AuthDialog: React.FC<AuthDialogProps> = ({
  open,
  onClose,
  isLoginMode,
  toggleAuthMode
}) => {
  const navigate = useNavigate();
  const { login, register, error: authError } = useAuth();
  
  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setFormError(null);
  };
  
  const handleClose = () => {
    onClose();
    resetForm();
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    
    try {
      if (isLoginMode) {
        // Login
        await login(email, password);
        handleClose();
        navigate('/');
      } else {
        // Register
        await register(name, email, password);
        handleClose();
        navigate('/');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      PaperProps={{
        sx: dialogStyles
      }}
    >
      <DialogTitle sx={{ 
        pb: 1, 
        color: theme.palette.primary.main,
        fontWeight: 600
      }}>
        {isLoginMode ? 'Log In' : 'Create Account'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {!isLoginMode && (
            <TextField
              autoFocus
              margin="dense"
              id="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              sx={textFieldStyles}
            />
          )}
          <TextField
            autoFocus={isLoginMode}
            margin="dense"
            id="email"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            sx={textFieldStyles}
          />
          <TextField
            margin="dense"
            id="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            sx={textFieldStyles}
          />
          
          {(formError || authError) && (
            <Typography 
              variant="caption" 
              color="error" 
              sx={{ display: 'block', mt: 1 }}
            >
              {formError || authError}
            </Typography>
          )}
          
          <Box sx={{ mt: 2, mb: 1 }}>
            <Button
              variant="text"
              size="small"
              onClick={toggleAuthMode}
              sx={{ 
                textTransform: 'none',
                color: theme.palette.primary.main,
                p: 0,
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline'
                }
              }}
            >
              {isLoginMode 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Log in"}
            </Button>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              color: alpha('#FFFFFF', 0.7),
              '&:hover': {
                backgroundColor: alpha('#FFFFFF', 0.1),
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}
            sx={authButtonStyles}
          >
            {isLoginMode ? 'Login' : 'Sign Up'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AuthDialog;