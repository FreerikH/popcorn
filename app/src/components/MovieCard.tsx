import React, { useState } from 'react';
import {
  Card,
  CardMedia,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Dialog,
  DialogContent,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

// Define a type for genre which can be either a string or an object with id and name
type Genre = string | { id: number; name: string };

interface MovieCardProps {
  movieData: {
    original_title: string;
    poster_path: string | null;
    overview: string;
    genres: Array<Genre>; // Updated to accept both string and object genres
    release_date: string;
    [key: string]: any;
  };
  loading: boolean;
  submitting: boolean;
  error: string | null;
  onSubmitRating: (rating: 'yes' | 'no' | 'maybe') => void;
  isSmallScreen: boolean;
  isVerySmallScreen: boolean;
  overviewCharLimit?: number;
}

const MovieCard: React.FC<MovieCardProps> = ({
  movieData,
  loading,
  error,
  onSubmitRating,
  isVerySmallScreen,
  overviewCharLimit = 150, // Default character limit for overview
}) => {
  const [expanded, setExpanded] = useState(false);
  const [fullPosterOpen, setFullPosterOpen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setExpanded(!expanded);
  };
  
  const handleToggleOverlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling up
    setShowOverlay(!showOverlay);
  };
    
  const handleCloseFullPoster = () => {
    setFullPosterOpen(false);
  };

  const getPosterUrl = (path: string | null) => {
    if (path && path.startsWith("https://")) return path;
    if (!path) return 'https://via.placeholder.com/300x450?text=No+Image';
    return `https://image.tmdb.org/t/p/w500${path}`;
  };
  
  // Helper function to get genre display name, handling both string and object genres
  const getGenreDisplayName = (genre: Genre): string => {
    if (typeof genre === 'string') {
      return genre;
    } else if (genre && typeof genre === 'object' && 'name' in genre) {
      return genre.name;
    }
    return 'Unknown Genre';
  };
  
  // Helper function to get a unique key for genre
  const getGenreKey = (genre: Genre, index: number): string => {
    if (typeof genre === 'string') {
      return `genre-str-${index}-${genre}`;
    } else if (genre && typeof genre === 'object' && 'id' in genre) {
      return `genre-obj-${index}-${genre.id}`;
    }
    return `genre-unknown-${index}`;
  };
  
  if (loading) {
    return (
      <Card sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
        <CircularProgress />
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
        <Typography color="error">{error}</Typography>
      </Card>
    );
  }

  if (!movieData) {
    return (
      <Card sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
        <Typography>No movie data available</Typography>
      </Card>
    );
  }

  // Check if the overview needs truncation
  const needsTruncation = movieData.overview.length > overviewCharLimit;
  const truncatedOverview = needsTruncation && !expanded 
    ? `${movieData.overview.substring(0, overviewCharLimit)}...` 
    : movieData.overview;

  return (
    <Card 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 0 // Remove border radius from the card
      }}
    >
      {/* Movie Poster as Background */}
      <Box sx={{ 
        position: 'relative',
        width: '100%',
        flex: 1,
        overflow: 'hidden',
      }}>
        <CardMedia
          component="img"
          image={getPosterUrl(movieData.poster_path)}
          alt={movieData.original_title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            borderRadius: 0 // Explicitly remove any border radius
          }}
        />
        
        {/* Overlay Gradient - Only visible when showOverlay is true */}
        {showOverlay && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)',
            zIndex: 1,
            transition: 'opacity 0.3s ease'
          }}/>
        )}
        
        {/* Fullscreen Toggle Button - Changes icon based on overlay state */}
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
                src={getPosterUrl(movieData.poster_path)} 
                alt={movieData.original_title}
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
        
        {/* Movie Details Overlay - Only visible when showOverlay is true */}
        {showOverlay && (
          <Box sx={{ 
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            padding: isVerySmallScreen ? 1.5 : 2,
            zIndex: 2,
            transition: 'opacity 0.3s ease'
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
              {movieData.original_title}
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
                sx={{ 
                  fontWeight: 'medium',
                }}
              >
                {movieData.release_date && new Date(movieData.release_date).getFullYear()}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'medium',
                }}
              >
                {movieData.runtime && `${movieData.runtime} min`}
              </Typography>
            </Box>
            
            {movieData.genres && movieData.genres.length > 0 && (
              <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {movieData.genres.map((genre, index) => (
                  <Typography 
                    key={getGenreKey(genre, index)}
                    variant="caption" 
                    sx={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                      color: 'white',
                      px: 1, 
                      borderRadius: 1 
                    }}
                  >
                    {getGenreDisplayName(genre)}
                  </Typography>
                ))}
              </Box>
            )}
            
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
                  overflow: expanded ? 'visible' : 'hidden',
                  transition: 'max-height 0.3s ease'
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
                    color: 'white',
                    opacity: 0.8,
                    '&:hover': {
                      opacity: 1,
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
      
      {/* Rating Buttons - Always at the bottom */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        backgroundColor: 'white',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        height: isVerySmallScreen ? 48 : 56
      }}>
        <Box 
          sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '33.33%',
            cursor: 'pointer',
            backgroundColor: 'rgba(244, 67, 54, 0.05)', // Light red background
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.15)'
            },
            borderRight: '1px solid rgba(0,0,0,0.05)'
          }}
          onClick={() => onSubmitRating('no')}
        >
          <CloseIcon fontSize={isVerySmallScreen ? "small" : "medium"} color="error" />
          <Typography 
            variant="caption" 
            color="error"
            sx={{ mt: 0.5, fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem' }}
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
            backgroundColor: 'rgba(3, 169, 244, 0.05)', // Light blue background
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(3, 169, 244, 0.15)'
            },
            borderRight: '1px solid rgba(0,0,0,0.05)'
          }}
          onClick={() => onSubmitRating('maybe')}
        >
          <HelpOutlineIcon fontSize={isVerySmallScreen ? "small" : "medium"} color="info" />
          <Typography 
            variant="caption" 
            color="info.main"
            sx={{ mt: 0.5, fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem' }}
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
            backgroundColor: 'rgba(76, 175, 80, 0.05)', // Light green background
            transition: 'background-color 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.15)'
            }
          }}
          onClick={() => onSubmitRating('yes')}
        >
          <CheckIcon fontSize={isVerySmallScreen ? "small" : "medium"} color="success" />
          <Typography 
            variant="caption" 
            color="success.main"
            sx={{ mt: 0.5, fontSize: isVerySmallScreen ? '0.65rem' : '0.75rem' }}
          >
            Watch
          </Typography>
        </Box>
      </Box>
    </Card>
  );
};

export default MovieCard;