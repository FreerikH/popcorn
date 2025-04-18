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
      // Main primary color - darker red
      main: '#990000', // Darker red than Netflix
      light: '#C23B22',
      dark: '#660000',
      contrastText: '#FFFFFF',
    },
    secondary: {
      // Secondary color
      main: '#221F1F', // Dark gray/black
      light: '#484848',
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
      primary: '#212121',
      secondary: '#757575',
      disabled: '#9E9E9E',
    },
    // Background colors
    background: {
      default: '#F5F5F5',
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