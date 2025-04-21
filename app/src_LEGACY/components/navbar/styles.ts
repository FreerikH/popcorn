import { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import theme from '../../theme';

// Navbar styles
export const appBarStyles: SxProps<Theme> = {
  backgroundColor: theme.palette.secondary.main,
  color: 'white',
  boxShadow: 'none',
  borderTop: '2px solid',
  borderTopColor: theme.palette.primary.main,
  height: '50px',
};

// Login button styles
export const loginButtonStyles: SxProps<Theme> = {
  textTransform: 'none',
  borderRadius: 1,
  padding: '4px 12px',
  backgroundColor: alpha(theme.palette.primary.main, 0.2),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.3)
  },
  transition: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1)'
};

// User button styles
export const userButtonStyles: SxProps<Theme> = {
  textTransform: 'none',
  borderRadius: 0,
  padding: '4px 12px',
  backgroundColor: alpha('#000000', 0.3),
  height: '42px',
  marginRight: '-16px',
  '&:hover': {
    backgroundColor: alpha('#000000', 0.5)
  },
  transition: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1)'
};

// Menu item styles
export const menuItemStyles: SxProps<Theme> = {
  py: 0.75,
  px: 2,
  minHeight: '40px',
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2)
  }
};

// Auth dialog styles
export const dialogStyles: SxProps<Theme> = {
  borderRadius: 2,
  bgcolor: theme.palette.secondary.light,
  color: 'white',
  minWidth: { xs: '90%', sm: '400px' }
};

// Text field styles
export const textFieldStyles: SxProps<Theme> = {
  mb: 2,
  '& .MuiOutlinedInput-root': {
    color: 'white',
    '& fieldset': {
      borderColor: alpha('#FFFFFF', 0.3),
    },
    '&:hover fieldset': {
      borderColor: alpha('#FFFFFF', 0.5),
    },
  },
  '& .MuiInputLabel-root': {
    color: alpha('#FFFFFF', 0.7),
  }
};

// Auth button styles
export const authButtonStyles: SxProps<Theme> = {
  bgcolor: theme.palette.primary.main,
  color: 'black',
  '&:hover': {
    bgcolor: theme.palette.primary.dark,
  }
};