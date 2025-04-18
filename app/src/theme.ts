import { createTheme } from '@mui/material/styles';
import { PaletteColorOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface CustomPalette {
    primary: PaletteColorOptions;
    secondary: PaletteColorOptions;
    error: PaletteColorOptions;
    warning: PaletteColorOptions;
    info: PaletteColorOptions;
    success: PaletteColorOptions;
  }
 
  // Allow configuration using `createTheme`
  interface CustomThemeOptions {
    palette?: CustomPalette;
  }
}

// Create your custom theme
const theme = createTheme({
  palette: {
    primary: {
      // Main primary color - popcorn buttery color
      main: '#F8E3A3', // Buttery popcorn yellow
      light: '#FFF9D6',
      dark: '#E6C76A',
      contrastText: '#2C2C2C', // Dark text for contrast on light background
    },
    secondary: {
      // Secondary color - complementary to popcorn
      main: '#6E5C41', // Darker brown that complements popcorn
      light: '#9C8A6E',
      dark: '#483D2A',
      contrastText: '#FFFFFF',
    },
    // You can customize other palette colors too
    error: {
      main: '#FF4D4F',
    },
    warning: {
      main: '#FAAD14',
    },
    info: {
      main: '#1890FF',
    },
    success: {
      main: '#52C41A',
    },
    // You can also customize text colors
    text: {
      primary: '#2C2C2C',
      secondary: '#5C5C5C',
      disabled: '#9E9E9E',
    },
    // Background colors
    background: {
      default: '#FFFBEE', // Very light cream background
      paper: '#FFFFFF',
    },
  },
  // You can customize typography, shape, spacing, and other theme aspects too
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;