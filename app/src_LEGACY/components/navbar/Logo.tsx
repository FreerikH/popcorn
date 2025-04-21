import React from 'react';
import { Box, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import theme from '../../theme';

interface LogoProps {
  onClick: () => void;
}

const Logo: React.FC<LogoProps> = ({ onClick }) => {
  return (
    <Box 
      sx={{ 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer'
      }}
      onClick={onClick}
    >
      {/* Logo image */}
      <Box
        sx={{
          width: 32,
          height: 32,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
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

      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
          no<span style={{ color: alpha('#FFFFFF', 0.5) }}>w</span> you pick
        </Typography>
      </Box>
    </Box>
  );
};

export default Logo;