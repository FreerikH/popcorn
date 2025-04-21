// src/pages/MovieRatingPage.tsx
import { useState, useEffect } from 'react';
import { 
  Box,
  Container,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import MovieCard from '../components/MovieCard';

// Define genre type to handle both string and object formats
type Genre = string | { id: number; name: string };

// Define movie data type
interface MovieData {
  id: number; 
  original_title: string;
  overview: string;
  poster_path: string | null;
  genres: Array<Genre>;
  release_date: string;
  [key: string]: any;
}

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
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('127.0.0.1');
  
  if (isProduction) {
    return '/api/movie';
  } else {
    return 'http://127.0.0.1:8000/api/movie';
  }
};

const MovieRatingPage = () => {
  const theme = useTheme();
  const { user } = useAuth();
  
  // Use useMediaQuery directly with the custom theme
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isVerySmallScreen = useMediaQuery('(max-height: 600px)');
  
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

  // Function to process movie data consistently
  const processMovieData = (data: any): MovieData => {
    // Process genres - now keeping the original format (either object or string)
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

  // Updated submitRating function for instantaneous movie switching
  const submitRating = (selectionValue: NonNullable<SelectionType>) => {
    if (!movieData || !movieData.id) {
      setSnackbar({
        open: true,
        message: 'Cannot submit rating: Movie ID not available',
        severity: 'error'
      });
      return;
    }

    if (!user) {
      setSnackbar({
        open: true,
        message: 'Please log in to rate movies',
        severity: 'error'
      });
      return;
    }

    // Store the current movie data for the API call
    const movieToRate = movieData;
    
    // Immediately update UI to show the next movie
    if (nextMovieData) {
      setMovieData(nextMovieData);
      setNextMovieData(null);
      
      // Start preloading the next movie right away
      preloadNextMovie();
    } else {
      // If no preloaded movie, start loading the next one
      setLoading(true);
      fetchNextMovie();
    }
    
    // Submit the rating in the background
    setSubmitting(true);
    
    const payload = {
      user_id: user.id,
      movie_id: movieToRate.id,
      rating: selectionToRating[selectionValue]
    };

    fetch(getApiBaseUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to submit rating: ${response.status}`);
      }
      return response.json();
    })
    .catch(err => {
      console.error('Error submitting rating:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit rating, but we moved to the next movie.',
        severity: 'error'
      });
    })
    .finally(() => {
      setSubmitting(false);
    });
  };

  // Helper function to fetch a movie from the API with silent retry for status code 34
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
          // Log to console but don't display to user
          console.log(`[DEBUG] API returned error in response body:`, data);
          
          // Increment retry counter
          currentRetry++;
          
          if (currentRetry >= maxRetries) {
            // Instead of throwing an error, return null and let the calling function handle it silently
            console.log(`Exhausted retries for status code 34 error. Moving on silently.`);
            return null;
          }
          
          // Wait a moment before retrying (exponential backoff)
          const delay = 1000 * currentRetry;
          console.log(`Silently retrying after ${delay}ms (attempt ${currentRetry} of ${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
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

  // Function to preload the next movie
  const preloadNextMovie = async () => {
    try {
      debug('Preloading next movie', {});
      const data = await fetchMovieFromAPI();
      if (data) {
        setNextMovieData(data);
        debug('Successfully preloaded next movie', data);
      } else {
        // If data is null, it might be because of a status code 34 error that we're handling silently
        // Try one more time without showing an error to the user
        console.log("Received null when preloading, trying again silently");
        
        // Wait a second before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryData = await fetchMovieFromAPI();
        
        if (retryData) {
          setNextMovieData(retryData);
          debug('Successfully preloaded next movie after retry', retryData);
        } else {
          // Still no data after retry, but we'll continue silently
          console.log('Failed to preload next movie after silent retry');
          // Leave nextMovieData as null - we'll load when needed
        }
      }
    } catch (err) {
      console.error('Error preloading next movie:', err);
      // We don't show an error to the user for preloading failures, regardless of error type
    }
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
        // If data is null, it might be because of a status code 34 error that we're handling silently
        // Try one more time without showing an error to the user
        console.log("Received null from fetchMovieFromAPI, trying again silently");
        
        // Wait a second before trying again
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryData = await fetchMovieFromAPI();
        
        if (retryData) {
          setMovieData(retryData);
          setError(null);
        } else {
          // Still no data after retry, but we'll continue silently without showing an error
          console.error('Failed to fetch movie data after silent retry');
          // Keep the previous movie data if available, otherwise use empty movie
          if (!movieData) {
            setMovieData(emptyMovie);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching next movie:', err);
      // Only show error to user if it's not a status code 34 error
      if (err instanceof Error && !err.message.includes('status_code: 34')) {
        setError('Failed to load next movie. Please try again later.');
        setSnackbar({
          open: true,
          message: 'Failed to load next movie. Please try again later.',
          severity: 'error'
        });
      } else {
        // For status code 34 errors, log to console but don't show to user
        console.log('Silent error (status code 34) when fetching next movie');
        // Keep the previous movie data if available
        if (!movieData) {
          setMovieData(emptyMovie);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Prevent scrolling on the body
  useEffect(() => {
    // Apply these styles to prevent scrolling
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      // Clean up styles when component unmounts
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Height of navbar and button container
  const navbarHeight = 42; // AppBar default height
  const buttonHeight = isVerySmallScreen ? 48 : 56;

  return (
    /*<Box sx={{ 
      height: 'calc(100vh - 42px)', // Subtract navbar height
      width: '100vw',
      maxHeight: 'calc(100vh - 42px)',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'fixed',
      top: '42px', // Start below navbar
      left: 0,
      backgroundColor: theme.palette.secondary.main,
    }}>*/
    <Box sx={{ 
      height: 'calc(100vh - 50px)',
      width: '100%',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: theme.palette.secondary.main,
    }}>
      {/* Content container that takes exactly the remaining space */}
      <Box sx={{
        height: `calc(100vh - ${navbarHeight}px - ${buttonHeight}px)`,
        maxHeight: `calc(100vh - ${navbarHeight}px - ${buttonHeight}px)`,
        width: '100%',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <Container 
          maxWidth="sm" 
          sx={{ 
            height: '100%',
            padding: 0,
          }}
        >
          <MovieCard
            movieData={movieData || emptyMovie}
            loading={loading}
            submitting={submitting}
            error={error}
            onSubmitRating={submitRating}
            isSmallScreen={isSmallScreen}
            isVerySmallScreen={isVerySmallScreen}
          />
        </Container>
      </Box>

      {/* Feedback Snackbar - Always at the top */}
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
  );
};

export default MovieRatingPage;