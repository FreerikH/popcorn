import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../contexts/ApiContext';
import {
  Typography,
  Box,
  CircularProgress,
  CardMedia,
  IconButton,
  Dialog,
  DialogContent,
  Button,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

interface Movie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  runtime?: number;
  // Updated genre type to handle both object array and string array formats
  genres: Array<{ id: number | string; name: string } | string>;
}

const MovieExplorer: React.FC = () => {
  const api = useApi();
  const theme = useTheme();
 
  // Responsive states
  const isVerySmallScreen = useMediaQuery(theme.breakpoints.down('xs'));
 
  // Use a ref to track if this is the initial load
  const isInitialMount = React.useRef(true);
  
  // Ref to track if a replenish operation is in progress
  const isReplenishing = React.useRef(false);
  
  // Movie states
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [movieQueue, setMovieQueue] = useState<Movie[]>([]);
  const [loadingMovie, setLoadingMovie] = useState(false);
  
  // Track all previously seen movie IDs to avoid duplicates
  const [seenMovieIds, setSeenMovieIds] = useState<number[]>([]);
 
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [fullPosterOpen, setFullPosterOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
 
  // Queue configuration - adjusted for new batch fetch approach
  const FETCH_SIZE = 10; // Number of movies to request in each API call
  const MIN_QUEUE_SIZE = 5; // Threshold for when to fetch more movies

  // Constants
  const overviewCharLimit = 150;

  // Fetch a batch of movies
  const fetchMovies = useCallback(async (count: number = FETCH_SIZE): Promise<Movie[]> => {
    try {
      // Create ignore parameter with all previously seen movie IDs
      const ignoreParam = seenMovieIds.length > 0 ? `&ignore=${seenMovieIds.join(',')}` : '';
      
      // Use the results query parameter to get multiple movies at once, plus ignore parameter
      const movies = await api.get<Movie[]>(`/movies?results=${count}${ignoreParam}`);
      
      if (!movies || !Array.isArray(movies)) {
        console.error('Invalid response format:', movies);
        return [];
      }
      
      // Only update the seen IDs if we actually got movies back
      if (movies.length > 0) {
        // Add newly fetched movie IDs to the seen list
        const newMovieIds = movies.map(movie => movie.id);
        setSeenMovieIds(prevIds => [...prevIds, ...newMovieIds]);
      }
      
      // Normalize genres format for all fetched movies
      return movies.map(movie => {
        if (movie && Array.isArray(movie.genres)) {
          // If genres is an array of strings, convert to expected format
          const normalizedGenres = movie.genres.map(genre => {
            if (typeof genre === 'string') {
              // For string genres, use the string as both id and name
              return { id: genre, name: genre };
            }
            // Otherwise pass through the existing format
            return genre;
          });
          return { ...movie, genres: normalizedGenres };
        }
        return movie;
      });
    } catch (err) {
      console.error('Failed to fetch movies:', err);
      return [];
    }
  }, [api, seenMovieIds]);

  // Replenish the movie queue to maintain minimum queue size
  const replenishQueue = useCallback(async () => {
    // Prevent duplicate fetches using the ref
    if (isReplenishing.current) {
      return;
    }
    
    // Set flag to indicate we're replenishing
    isReplenishing.current = true;
    
    // Track if component is still mounted
    let isMounted = true;
    
    try {
      // Set a loading state for background fetch only if we're critically low
      if (movieQueue.length < 2) {
        setLoadingMovie(true);
      }
     
      // Fetch a batch of movies
      const movies = await fetchMovies();
     
      // Only update state if component is still mounted and we got valid movies
      if (isMounted && movies.length > 0) {
        setMovieQueue(prevQueue => [...prevQueue, ...movies]);
      }
    } catch (err) {
      console.error('Failed to replenish movie queue:', err);
      // We don't set error state since this is a background operation
    } finally {
      if (isMounted) {
        setLoadingMovie(false);
        // Reset the replenishing flag
        isReplenishing.current = false;
      }
    }
   
    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      isMounted = false;
      // Make sure we reset the flag if component unmounts
      isReplenishing.current = false;
    };
  }, [fetchMovies, movieQueue.length]);

  // Load initial data
  useEffect(() => {
    const initialize = async () => {
      if (!isInitialMount.current) return;
      
      setLoadingMovie(true);
      setError(null);
     
      try {
        // Fetch initial batch of movies
        const movies = await fetchMovies();
       
        if (movies.length > 0) {
          // Set the first movie as current
          setCurrentMovie(movies[0]);
         
          // Add the rest to the queue
          if (movies.length > 1) {
            setMovieQueue(movies.slice(1));
          }
        } else {
          setError('Failed to fetch movies');
        }
      } catch (err) {
        setError('Failed to fetch movies');
        console.error(err);
      } finally {
        setLoadingMovie(false);
        // Mark that initial mounting is done
        isInitialMount.current = false;
      }
    };
    initialize();
  }, [fetchMovies]);

  // Remove console.log statements
  // Effect to monitor queue size and replenish as needed
  useEffect(() => {
    // Only replenish if:
    // 1. We're not currently loading
    // 2. Queue is below minimum threshold but not empty
    // 3. We have a current movie (component is fully initialized)
    if (!loadingMovie && 
        movieQueue.length < MIN_QUEUE_SIZE && 
        movieQueue.length >= 0 && 
        currentMovie !== null) {
      replenishQueue();
    }
  }, [loadingMovie, movieQueue.length, replenishQueue, currentMovie]);

  // Move to the next movie
  const moveToNextMovie = useCallback(() => {
    // If we have movies in the queue, use the first one
    if (movieQueue.length > 0) {
      // Get the first movie from the queue
      const nextMovie = movieQueue[0];
     
      // Update current movie
      setCurrentMovie(nextMovie);
     
      // Remove the used movie from the queue
      setMovieQueue(prevQueue => prevQueue.slice(1));
     
      // Reset UI state for the new movie
      setExpanded(false);
      
      // We don't need to explicitly call replenishQueue here
      // as the useEffect will handle this when queue length changes
    } else {
      // If queue is empty (rare case), fetch a new batch
      if (!isReplenishing.current) {
        isReplenishing.current = true;
        setLoadingMovie(true);
        fetchMovies(1).then(movies => {
          if (movies.length > 0) {
            setCurrentMovie(movies[0]);
          } else {
            setError('Failed to fetch movie');
          }
          setLoadingMovie(false);
          isReplenishing.current = false;
        }).catch(err => {
          console.error('Failed to fetch movie:', err);
          setError('Failed to fetch movie');
          setLoadingMovie(false);
          isReplenishing.current = false;
        });
      }
    }
  }, [movieQueue, fetchMovies]);

  // Rate current movie
  const handleRating = async (rating: 'yes' | 'no' | 'maybe') => {
    if (!currentMovie) return;
   
    // Store current movie ID for the API call
    const movieId = currentMovie.id;
   
    // Immediately show the next movie without waiting for API response
    moveToNextMovie();
   
    // Convert rating type to numeric value
    const numericRating = rating === 'yes' ? 5 : rating === 'maybe' ? 3 : 1;
   
    // Send the rating in the background
    try {
      await api.post('/movies/preferences', {
        movie_id: movieId,
        rating: numericRating
      });
    } catch (err) {
      // We don't show the error to the user since we've already moved on
      console.error('Failed to save rating:', err);
    }
  };

  // UI handlers
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
 
  const handleToggleOverlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOverlay(!showOverlay);
  };
 
  const openFullPoster = () => {
    if (currentMovie?.poster_path) {
      setFullPosterOpen(true);
    }
  };
 
  const handleCloseFullPoster = () => {
    setFullPosterOpen(false);
  };

  const getPosterUrl = (path: string | null) => {
    if (path && path.startsWith("https://")) return path;
    if (!path) return 'https://via.placeholder.com/300x450?text=No+Image';
    return `https://image.tmdb.org/t/p/w500${path}`;
  };

  // Helper function to render genre chips
  const renderGenres = () => {
    if (!currentMovie?.genres || currentMovie.genres.length === 0) {
      return null;
    }
    return (
      <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {currentMovie.genres.map((genre, index) => {
          // Handle both string and object genres
          const genreName = typeof genre === 'string' ? genre : genre.name;
          // Use index for the key to ensure uniqueness
          const key = `genre-${index}`;
         
          return (
            <Typography
              key={key}
              variant="caption"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                px: 1,
                borderRadius: 1
              }}
            >
              {genreName}
            </Typography>
          );
        })}
      </Box>
    );
  };

  // Skip Button Component - Extracted to reuse across states
  const SkipButton = () => (
    <Button
      variant="contained"
      onClick={moveToNextMovie}
      sx={{
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: 'white',
        zIndex: 2,
        padding: isVerySmallScreen ? '4px 8px' : '6px 16px',
        '&:hover': {
          backgroundColor: 'rgba(0,0,0,0.7)',
        },
        minWidth: 'auto',
        fontSize: isVerySmallScreen ? '0.75rem' : '0.875rem',
      }}
      size={isVerySmallScreen ? "small" : "medium"}
    >
      Skip
    </Button>
  );

  const buttonHeight = 50; //isVerySmallScreen ? 48 : 56;

  // Loading state
  if (loadingMovie) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <CircularProgress />
        </Box>
        <SkipButton />
        <Box sx={{
          height: isVerySmallScreen ? 48 : 56,
          width: '100%',
          flexShrink: 0,
        }} />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Typography color="error">{error}</Typography>
        </Box>
        <SkipButton />
        <Box sx={{
          height: isVerySmallScreen ? 48 : 56,
          width: '100%',
          flexShrink: 0,
        }} />
      </Box>
    );
  }

  // Empty state
  if (!currentMovie) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}>
        <Box sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Typography>No movie data available</Typography>
        </Box>
        <SkipButton />
        <Box sx={{
          height: isVerySmallScreen ? 48 : 56,
          width: '100%',
          flexShrink: 0,
        }} />
      </Box>
    );
  }

  // Handle overview truncation
  const needsTruncation = currentMovie.overview.length > overviewCharLimit;
  const truncatedOverview = needsTruncation && !expanded
    ? `${currentMovie.overview.substring(0, overviewCharLimit)}...`
    : currentMovie.overview;

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      px: 0,
    }}>
      {/* Content Area */}
      <Box sx={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Movie Poster Background */}
        <CardMedia
          component="img"
          image={getPosterUrl(currentMovie.poster_path)}
          alt={currentMovie.title}
          onClick={openFullPoster}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: currentMovie.poster_path ? 'pointer' : 'default'
          }}
        />
       
        {/* Overlay Gradient */}
        {showOverlay && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)',
            zIndex: 1
          }}/>
        )}
       
        {/* Fullscreen Toggle Button */}
        <IconButton
          onClick={handleToggleOverlay}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            zIndex: 2,
            padding: '4px',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)',
            }
          }}
          size="small"
        >
          {showOverlay ?
            <FullscreenIcon fontSize={isVerySmallScreen ? "small" : "medium"} /> :
            <FullscreenExitIcon fontSize={isVerySmallScreen ? "small" : "medium"} />
          }
        </IconButton>
       
        {/* Skip Button */}
        <SkipButton />
       
        {/* Preload all movie images in the queue */}
        {movieQueue.map((movie) => (
          movie.poster_path && (
            <link key={`preload-${movie.id}`} rel="preload" href={getPosterUrl(movie.poster_path)} as="image" />
          )
        ))}
       
        {/* Dialog for full poster view */}
        <Dialog
          open={fullPosterOpen}
          onClose={handleCloseFullPoster}
          maxWidth="md"
          PaperProps={{
            sx: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden'
            }
          }}
        >
          <DialogContent sx={{ p: 0 }}>
            <Box sx={{ position: 'relative' }}>
              <img
                src={getPosterUrl(currentMovie.poster_path)}
                alt={currentMovie.title}
                style={{ width: '100%', height: 'auto', maxHeight: '90vh', objectFit: 'contain' }}
              />
              <IconButton
                onClick={handleCloseFullPoster}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogContent>
        </Dialog>
       
        {/* Movie Details */}
        {showOverlay && (
          <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            padding: isVerySmallScreen ? 1.5 : 2,
            zIndex: 2,
            maxHeight: '50%',
            overflow: 'auto'
          }}>
            <Typography
              variant={isVerySmallScreen ? "h6" : "h5"}
              component="div"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                lineHeight: 1.2,
                color: 'white',
                textShadow: '0px 1px 3px rgba(0,0,0,0.6)'
              }}
            >
              {currentMovie.title}
            </Typography>
           
            <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                mb: 1,
                color: 'white',
                opacity: 0.9
              }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 'medium' }}
              >
                {currentMovie.release_date && new Date(currentMovie.release_date).getFullYear()}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 'medium' }}
              >
                {currentMovie.runtime && `${currentMovie.runtime} min`}
              </Typography>
            </Box>
           
            {/* Updated genres display using the helper function */}
            {renderGenres()}
           
            {/* Overview text with read more functionality */}
            <Box>
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  fontSize: isVerySmallScreen ? '0.75rem' : '0.875rem',
                  color: 'white',
                  opacity: 0.85,
                  lineHeight: 1.4,
                }}
              >
                {truncatedOverview}
              </Typography>
             
              {needsTruncation && (
                <Box
                  onClick={toggleExpanded}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    mt: 0.5,
                    color: theme.palette.primary.main,
                    '&:hover': {
                      opacity: 0.9,
                    }
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem',
                      fontWeight: 'medium'
                    }}
                  >
                    {expanded ? 'Read less' : 'Read more'}
                  </Typography>
                  {expanded ?
                    <ExpandLessIcon sx={{ fontSize: 16, ml: 0.5 }} /> :
                    <ExpandMoreIcon sx={{ fontSize: 16, ml: 0.5 }} />
                  }
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>
     
    {/* Rating Buttons */}
    <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: theme.palette.background.default,
        height: buttonHeight,
        minHeight: buttonHeight,
        width: '100%',
        flexShrink: 0,
        borderTop: `1px solid ${theme.palette.secondary.main}`,
    }}>
        <Box
            sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '33.33%',
            cursor: 'pointer',
            backgroundColor: theme.palette.background.default,
            transition: 'background-color 0.2s',
            '&:hover': {
                backgroundColor: theme.palette.secondary.light
            },
            borderRight: `1px solid ${theme.palette.secondary.main}`,
            }}
            onClick={() => handleRating('no')}
        >
            <CloseIcon
            fontSize={isVerySmallScreen ? "small" : "medium"}
            sx={{ color: theme.palette.rating.skip }}
            />
            <Typography
            variant="caption"
            sx={{
                mt: 0.5,
                fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem',
                color: theme.palette.rating.skip,
                fontWeight: 'bold'
            }}
            >
            Skip
            </Typography>
        </Box>
       
        <Box
            sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '33.33%',
            cursor: 'pointer',
            backgroundColor: theme.palette.background.default,
            transition: 'background-color 0.2s',
            '&:hover': {
                backgroundColor: theme.palette.secondary.light
            },
            borderRight: `1px solid ${theme.palette.secondary.main}`,
            }}
            onClick={() => handleRating('maybe')}
        >
            <HelpOutlineIcon
            fontSize={isVerySmallScreen ? "small" : "medium"}
            sx={{ color: theme.palette.rating.maybe }}
            />
            <Typography
            variant="caption"
            sx={{
                mt: 0.5,
                fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem',
                color: theme.palette.rating.maybe,
                fontWeight: 'bold'
            }}
            >
            Maybe
            </Typography>
        </Box>
       
        <Box
            sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '33.33%',
            cursor: 'pointer',
            backgroundColor: theme.palette.background.default,
            transition: 'background-color 0.2s',
            '&:hover': {
                backgroundColor: theme.palette.secondary.light
            }
            }}
            onClick={() => handleRating('yes')}
        >
            <CheckIcon
            fontSize={isVerySmallScreen ? "small" : "medium"}
            sx={{ color: theme.palette.rating.watch }}
            />
            <Typography
            variant="caption"
            sx={{
                mt: 0.5,
                fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem',
                color: theme.palette.rating.watch,
                fontWeight: 'bold'
            }}
            >
            Watch
            </Typography>
        </Box>
        </Box>
    </Box>
  );
};

export default MovieExplorer;