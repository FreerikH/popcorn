import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Stack,
  Box
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { alpha } from '@mui/material/styles';

// Import our custom theme from the separate file
import theme from '../../theme';

// Define user type
interface User {
  id: number;
  name: string;
  avatar: string;
}

interface NavbarProps {
  users: User[];
  selectedUser: User;
  onSelectUser: (user: User) => void;
}

const Navbar: React.FC<NavbarProps> = ({ users, selectedUser, onSelectUser }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUserSelect = (user: User) => {
    onSelectUser(user);
    handleMenuClose();
  };

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: 'white',
        color: 'text.primary',
        boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
        borderTop: '2px solid',
        borderTopColor: theme.palette.primary.main, // Using our darker red from theme
        height: '42px', // Smaller height for the AppBar
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: '42px', px: 2, }}>
        <Box 
          sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography 
            variant="subtitle1" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.primary.main, // Using our darker red for title
              lineHeight: 1.1,
              fontSize: '1.05rem'
            }}
          >
            Popcorn
          </Typography>
          <Typography 
            variant="caption" 
            component="div" 
            sx={{ 
              fontWeight: 400,
              color: 'text.secondary',
              fontSize: '0.65rem',
              letterSpacing: '0.4px'
            }}
          >
            no you pick
          </Typography>
        </Box>
       
        {/* User Dropdown - Modified to fill full height with square corners */}
        <Button
          onClick={handleMenuOpen}
          color="inherit"
          endIcon={<KeyboardArrowDownIcon fontSize="small" />}
          sx={{ 
            textTransform: 'none',
            borderRadius: 0, // Removed rounded corners
            padding: '4px 12px',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            height: '42px', // Match the height of the AppBar
            marginRight: '-16px', // Extend to the right edge
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08)
            },
            transition: 'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar
              sx={{
                width: 28,
                height: 28,
                bgcolor: theme.palette.primary.main, // Using our darker red from theme
                fontSize: '0.85rem',
                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.1)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.8)}`
              }}
            >
              {selectedUser?.avatar || ''}
            </Avatar>
            <Typography 
              sx={{ 
                fontWeight: 500,
                fontSize: '0.85rem'
              }}
            >
              {selectedUser?.name || ''}
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
              borderRadius: 0, // Removed rounded corners from dropdown menu
              minWidth: '180px',
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.15))',
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            }
          }}
          MenuListProps={{
            sx: { py: 0.5 }
          }}
        >
          {users.map((user) => (
            <MenuItem
              key={user.id}
              onClick={() => handleUserSelect(user)}
              selected={selectedUser.id === user.id}
              sx={{
                py: 0.75,
                px: 2,
                minHeight: '40px',
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12)
                  }
                },
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.04)
                }
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: selectedUser.id === user.id 
                      ? theme.palette.primary.main
                      : alpha(theme.palette.primary.main, 0.7),
                    fontSize: '0.7rem',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.08)'
                  }}
                >
                  {String(user.avatar)}
                </Avatar>
                <Typography
                  sx={{
                    fontSize: '0.85rem',
                    fontWeight: selectedUser.id === user.id ? 500 : 400
                  }}
                >
                  {String(user.name)}
                </Typography>
              </Stack>
            </MenuItem>
          ))}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;