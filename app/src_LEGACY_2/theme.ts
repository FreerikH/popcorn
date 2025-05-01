import { createTheme } from '@mui/material/styles';

// First, we need to extend the Palette and PaletteOptions interfaces
declare module '@mui/material/styles' {
  interface Palette {
    rating: {
      skip: string;
      maybe: string;
      watch: string;
    };
  }
  
  interface PaletteOptions {
    rating?: {
      skip?: string;
      maybe?: string;
      watch?: string;
    };
  }
}

// Now create the theme with our custom properties
const theme = createTheme({
  palette: {
    primary: {
      main: '#f7bd31', // Yellow - keeping your original primary
      light: '#f9cc5c', // Lighter yellow for hover effects
      dark: '#d9a118', // Darker yellow for emphasis
    },
    secondary: {
      main: '#0a0b08', //'#2c2c2c', // Dark gray instead of red
      light: '#3d3d3d', // Lighter gray for hover effects
      dark: '#1a1a1a', // Darker gray
    },
    background: {
      default: '#0a0b08', // Keeping your original dark background
      paper: '#141411', // Slightly lighter than default for contrasting elements
    },
    action: {
      disabledBackground: '#2c2c2c',
      disabled: '#757575',
    },
    rating: {
      skip: '#f44336', // Red for skip
      maybe: '#aaaaaa', // Gray for maybe
      watch: '#f7bd31', // Yellow (primary) for watch
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
    }
  },
});

export default theme;