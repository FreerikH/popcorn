import { useState, useEffect } from 'react';
import { 
  Box,
  Container,
  ThemeProvider,
  CssBaseline,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';


// Import our Navbar component
import Navbar from './components/navbar/Navbar';

// Import our new MovieCard component
import MovieCard from './components/MovieCard';


// Define user type
interface User {
  id: number;
  name: string;
  avatar: string;
}

// Define genre type to handle both string and object formats
type Genre = string | { id: number; name: string };

// Define movie data type
interface MovieData {
  id: number; 
  original_title: string;
  overview: string;
  poster_path: string | null;
  genres: Array<Genre>; // Updated to handle both string and object genres
  release_date: string;
  [key: string]: any;
}

// Sample users data
const users: User[] = [
  { id: 1, name: 'Freerik', avatar: 'F' },
  { id: 2, name: 'Kristina', avatar: 'K' }
];

// Define selection type
type SelectionType = 'yes' | 'no' | 'maybe' | null;

// Map selection to numeric rating
const selectionToRating: Record<NonNullable<SelectionType>, number> = {
  'no': 1,    // Cross
  'maybe': 2, // Question mark
  'yes': 3    // Checkmark
};

// Empty movie data template
const emptyMovie: MovieData = {
  id: 0,
  original_title: '',
  overview: '',
  poster_path: null,
  genres: [],
  release_date: '',
};

// Get the appropriate API base URL depending on the environment
const getApiBaseUrl = (): string => {
  // Check if we're running in production by examining the current URL
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
  
  if (isProduction) {
    return '/app/movie'; // Production API path
  } else {
    return 'http://127.0.0.1:8000/api/movie'; // Development API path
  }
};

function App() {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmallScreen = useMediaQuery('(max-height: 600px)');
  
  const [selectedUser, setSelectedUser] = useState<User>(users[0]);
  const [movieData, setMovieData] = useState<MovieData | null>(null);
  const [nextMovieData, setNextMovieData] = useState<MovieData | null>(null);

  // Add a logging function to help debug
  const debug = (message: string, data: any) => {
    console.log(`[DEBUG] ${message}:`, data);
  };
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'error';
  }>({
    open: false,
    message: '',
    severity: 'error'
  });
  
  // Fetch movie data from API
  useEffect(() => {
    fetchNextMovie();
  }, []);

  // Start preloading the next movie once the current movie is loaded
  useEffect(() => {
    // Only preload the next movie if we have a current movie and don't already have a preloaded movie
    if (movieData && movieData.id !== 0 && !nextMovieData) {
      preloadNextMovie();
    }
  }, [movieData]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
  };

  // Function to process movie data consistently
  const processMovieData = (data: any): MovieData => {
    // Process genres - now keeping the original format (either object or string)
    // This preserves the object structure when needed by the MovieCard component
    let processedGenres = [];
    if (data.genres && Array.isArray(data.genres)) {
      processedGenres = data.genres;
    }
    
    // Ensure required properties exist
    return {
      id: data.id || 0,
      original_title: data.original_title || '',
      overview: data.overview || '',
      poster_path: data.poster_path || null,
      genres: processedGenres,
      release_date: data.release_date || '',
      ...data  // Keep all other properties
    };
  };

  // Function to submit rating
  const submitRating = async (selectionValue: NonNullable<SelectionType>) => {
    if (!movieData || !movieData.id) {
      setSnackbar({
        open: true,
        message: 'Cannot submit rating: Movie ID not available',
        severity: 'error'
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        user_id: selectedUser.id,
        movie_id: movieData.id,
        rating: selectionToRating[selectionValue]
      };

      const response = await fetch(getApiBaseUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit rating: ${response.status}`);
      }

      // Use the preloaded movie if available
      if (nextMovieData) {
        setMovieData(nextMovieData);
        setNextMovieData(null); // Clear preloaded movie
        setLoading(false);
        
        // Immediately start preloading the next movie for future use
        preloadNextMovie();
      } else {
        // Fallback to normal fetch if preloaded movie isn't available
        fetchNextMovie();
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit rating. Please try again.',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Function to preload the next movie
  const preloadNextMovie = async () => {
    try {
      debug('Preloading next movie', {});
      const data = await fetchMovieFromAPI();
      if (data) {
        setNextMovieData(data);
        debug('Successfully preloaded next movie', data);
      }
    } catch (err) {
      console.error('Error preloading next movie:', err);
      // We don't show an error to the user for preloading failures
    }
  };

  // Helper function to fetch a movie from the API
  const fetchMovieFromAPI = async (): Promise<MovieData | null> => {
    let maxRetries = 3; // Maximum number of retry attempts
    let currentRetry = 0;
    
    while (currentRetry < maxRetries) {
      try {
        const response = await fetch(getApiBaseUrl());
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if the response contains an error message despite 200 status
        if (data.success === false || data.status_code === 34) {
          debug('API returned error in response body', data);
          
          // Increment retry counter
          currentRetry++;
          
          if (currentRetry >= maxRetries) {
            throw new Error(`API returned error: ${data.status_message || 'Resource not found'}`);
          }
          
          // Wait a moment before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
          continue; // Skip to next iteration of the while loop
        }
        
        const processedData = processMovieData(data);
        debug('Processed movie data from API', processedData);
        
        return processedData;
      } catch (err) {
        console.error('Error fetching movie:', err);
        
        if (currentRetry >= maxRetries - 1) {
          throw err; // Re-throw the error after exhausting retries
        } else {
          // Otherwise, increment retry counter and continue
          currentRetry++;
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * currentRetry));
        }
      }
    }
    
    return null;
  };

  // Function to fetch the next movie with improved error handling
  const fetchNextMovie = async () => {
    setLoading(true);
    
    try {
      const data = await fetchMovieFromAPI();
      
      if (data) {
        setMovieData(data);
        setError(null);
      } else {
        throw new Error('Failed to fetch movie data');
      }
    } catch (err) {
      console.error('Error fetching next movie:', err);
      setError('Failed to load next movie. Please try again later.');
      setSnackbar({
        open: true,
        message: 'Failed to load next movie. Please try again later.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Add a style to the root element to prevent scrolling
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    
    // Cleanup when component unmounts
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {/* Root container with fixed height */}
      <Box sx={{ 
        height: '100vh', 
        width: '100vw', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Using our Navbar component */}
        <Navbar 
          users={users}
          selectedUser={selectedUser}
          onSelectUser={handleUserSelect}
        />
        
        {/* Main content area that takes remaining height with no overflow */}
        <Container 
          maxWidth="sm" 
          sx={{ 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 0
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'auto',
            flexGrow: 1,
          }}>
            <MovieCard
              movieData={movieData || emptyMovie}
              loading={loading}
              submitting={submitting}
              error={error}
              onSubmitRating={submitRating}
              isSmallScreen={isSmallScreen}
              isVerySmallScreen={isVerySmallScreen}
            />
          </Box>
        </Container>

        {/* Feedback Snackbar - Now at the top */}
        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;