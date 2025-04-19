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
      // Main primary color - popcorn gold from logo
      main: '#FFCC33', // Golden yellow from the logo
      light: '#FFE07A',
      dark: '#E6A800',
      contrastText: '#000000', // Black text for contrast on light background
    },
    secondary: {
      // Secondary color - black from logo background
      main: '#1A1A1A', // Dark background color
      light: '#2C2C2C',
      dark: '#000000',
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
      primary: '#000000',
      secondary: '#4A4A4A',
      disabled: '#9E9E9E',
    },
    // Background colors
    background: {
      default: '#FFFFFF', // Clean white background to make the black/gold pop
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