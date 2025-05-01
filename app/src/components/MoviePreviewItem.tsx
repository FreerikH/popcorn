import React from 'react';
import {
  ListItem,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Chip,
  Divider,
  Stack
} from '@mui/material';
import { Movie as MovieIcon } from '@mui/icons-material';

// Using generic props to avoid type conflicts with existing types
interface MoviePreviewItemProps {
  item: {
    preference: {
      movie_id: number;
      rating_combined?: number;
      match_status?: string;
    };
    movieDetails: any; // Using any to avoid conflicts with existing Movie type
    isLoading: boolean;
    error: string | null;
  };
}

// Utility functions for movie preview display
const getMatchChipColor = (match: string): "success" | "warning" | "error" => {
  switch (match) {
    case 'perfect': return 'success';
    case 'partial': return 'warning';
    default: return 'error';
  }
};

const MoviePreviewItem: React.FC<MoviePreviewItemProps> = ({ item }) => {
  const { preference, movieDetails, isLoading, error } = item;
  
  // Handle case where movieDetails might be null
  if (!movieDetails && !isLoading) {
    return (
      <React.Fragment>
        <ListItem sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
              <MovieIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <ListItemText
              primary={<Typography variant="subtitle1">Movie not found</Typography>}
              secondary={<Typography variant="body2" color="error">Movie details unavailable</Typography>}
            />
          </Box>
        </ListItem>
        <Divider />
      </React.Fragment>
    );
  }
  
  // Extract data from item structure with null checks
  const movieId = movieDetails?.id || preference?.movie_id;
  const title = movieDetails?.title || `Movie ${movieId}`;
  const posterPath = movieDetails?.poster_path;
  const overview = movieDetails?.overview;
  const genres = movieDetails?.genres || [];
  const streamingOptions = movieDetails?.streaming_options || [];
  const matchStatus = preference?.match_status;
  
  return (
    <React.Fragment>
      <ListItem sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', width: '100%' }}>
          {/* Increased avatar size */}
          <Box sx={{ mr: 2 }}>
            {isLoading ? (
              <Avatar variant="rounded" sx={{ width: 80, height: 80 }}>
                <MovieIcon sx={{ fontSize: 40 }} />
              </Avatar>
            ) : posterPath ? (
              <Avatar
                alt={title}
                src={posterPath}
                variant="rounded"
                sx={{ width: 80, height: 80 }}
              />
            ) : (
              <Avatar variant="rounded" sx={{ width: 80, height: 80, bgcolor: 'primary.main' }}>
                <MovieIcon sx={{ fontSize: 40 }} />
              </Avatar>
            )}
          </Box>
          
          <Box sx={{ flex: 1 }}>
            {/* Title and match status */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1
            }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                {isLoading ? 'Loading...' : title}
              </Typography>
              
              {matchStatus && (
                <Chip
                  label={matchStatus === 'perfect' ? 'Perfect Match!' : 
                        matchStatus === 'partial' ? 'Partial Match' : 'Mismatch'}
                  color={getMatchChipColor(matchStatus)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>

            {/* Error message */}
            {error && (
              <Typography variant="body2" color="error" component="div" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            
            {/* Genres */}
            {!isLoading && genres.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                {genres.map((genre: string, index: number) => (
                  <Chip 
                    key={index} 
                    label={genre} 
                    size="small" 
                    variant="outlined" 
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Stack>
            )}
            
            {/* Overview */}
            {!isLoading && overview && (
              <Typography variant="body2" color="text.secondary" component="div" sx={{ mb: 1 }}>
                {overview.length > 120
                  ? `${overview.substring(0, 120)}...`
                  : overview}
              </Typography>
            )}
            
            {/* Streaming options */}
            {!isLoading && streamingOptions.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {streamingOptions.map((option: string, index: number) => (
                    <Chip 
                      key={index} 
                      label={option} 
                      size="small" 
                      color="primary" 
                      sx={{ fontSize: '0.75rem' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      </ListItem>
      <Divider />
    </React.Fragment>
  );
};

export default MoviePreviewItem;