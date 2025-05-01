import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import {
  Typography,
  Paper,
  Box,
  List,
  Button,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Compare as CompareIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import MoviePreviewItem from './MoviePreviewItem'; // Import the new component

interface User {
  id: number;
  name: string;
  email: string;
}

interface Friend {
  id: number;
  user: User;
  friendSince: string;
}

interface CombinedPreference {
  movie_id: number;
  rating_combined: number;
  match: 'perfect' | 'partial' | 'mismatch';
}

interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  genres?: { id: number; name: string }[];
}

interface MovieWithPreference {
  preference: CombinedPreference;
  movieDetails: Movie | null;
  isLoading: boolean;
  error: string | null;
}

const FriendMovieComparison: React.FC = () => {
  const api = useApi();
  
  // State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [moviesWithPreferences, setMoviesWithPreferences] = useState<MovieWithPreference[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(10);

  // Load friends on component mount
  useEffect(() => {
    fetchFriends();
  }, []);

  // Fetch friends list
  const fetchFriends = async () => {
    setLoadingFriends(true);
    setError(null);
    
    try {
      const data = await api.get<Friend[]>('/friends');
      setFriends(data);
    } catch (err) {
      setError('Failed to fetch friends');
      console.error(err);
    } finally {
      setLoadingFriends(false);
    }
  };

  // Handle friend selection change
  const handleFriendChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setSelectedFriendId(value);
    setDisplayCount(10); // Reset display count on new friend selection
    
    if (value !== '') {
      fetchCombinedPreferences(Number(value));
    } else {
      setMoviesWithPreferences([]);
    }
  };

  // Fetch movie details for a specific preference
  const fetchMovieDetails = async (preference: CombinedPreference, index: number) => {
    try {
      const movie = await api.get<Movie>(`/movies?movie_id=${preference.movie_id}`);
      
      setMoviesWithPreferences(current => {
        const updated = [...current];
        updated[index] = {
          ...updated[index],
          movieDetails: movie,
          isLoading: false
        };
        return updated;
      });
    } catch (err) {
      console.error(`Failed to fetch details for movie ${preference.movie_id}`, err);
      
      setMoviesWithPreferences(current => {
        const updated = [...current];
        updated[index] = {
          ...updated[index],
          isLoading: false,
          error: 'Failed to load movie details'
        };
        return updated;
      });
    }
  };

  // Load initial batch of movie details
  const loadInitialMovieDetails = (moviesArray: MovieWithPreference[]) => {
    // Only load the first displayCount movies
    for (let i = 0; i < Math.min(displayCount, moviesArray.length); i++) {
      loadMovieDetails(i, moviesArray);
    }
  };
  
  // Load a specific movie's details
  const loadMovieDetails = (index: number, moviesArray = moviesWithPreferences) => {
    const item = moviesArray[index];
    if (!item || item.isLoading || item.movieDetails) return; // Skip if already loading or loaded
    
    // Mark as loading
    setMoviesWithPreferences(current => {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        isLoading: true
      };
      return updated;
    });
    
    // Fetch the details
    fetchMovieDetails(item.preference, index);
  };

  // Fetch combined preferences with the new API format
  const fetchCombinedPreferences = async (friendId: number) => {
    setLoadingComparison(true);
    setError(null);
    
    try {
      const data = await api.get<CombinedPreference[]>(`/movies/preferences/combined/${friendId}`);
      
      // Initialize movie preferences with not-yet-loaded state
      const initialMoviesWithPrefs = data.map(preference => ({
        preference,
        movieDetails: null,
        isLoading: false, // Set to false initially - we'll set it to true when we start loading
        error: null
      }));
      
      setMoviesWithPreferences(initialMoviesWithPrefs);
      
      // Only fetch details for the first batch of movies
      loadInitialMovieDetails(initialMoviesWithPrefs);
    } catch (err) {
      setError('Failed to fetch combined preferences');
      console.error(err);
      setMoviesWithPreferences([]);
    } finally {
      setLoadingComparison(false);
    }
  };

  // Handle load more button click
  const handleLoadMore = () => {
    const newDisplayCount = displayCount + 10;
    setDisplayCount(newDisplayCount);
    
    // Load details for the newly displayed movies
    for (let i = displayCount; i < Math.min(newDisplayCount, moviesWithPreferences.length); i++) {
      loadMovieDetails(i);
    }
  };


  // Get friend name by ID
  const getSelectedFriendName = () => {
    const friend = friends.find(f => f.user.id === Number(selectedFriendId));
    return friend ? friend.user.name : 'Selected Friend';
  };

  // Check if there are more items to load
  const hasMoreItems = moviesWithPreferences.length > displayCount;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <CompareIcon sx={{ mr: 1 }} />
        Movie Taste Comparison
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="friend-select-label">Select a Friend</InputLabel>
          <Select
            labelId="friend-select-label"
            value={selectedFriendId}
            onChange={handleFriendChange}
            label="Select a Friend"
            disabled={loadingFriends || friends.length === 0}
          >
            <MenuItem value="">
              <em>Select a friend</em>
            </MenuItem>
            {friends.map((friend) => (
              <MenuItem key={friend.user.id} value={friend.user.id}>
                {friend.user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {loadingFriends && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loadingFriends && friends.length === 0 && (
          <Alert severity="info">
            You need to add friends first to compare movie preferences.
          </Alert>
        )}
      </Box>

      {selectedFriendId && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Your Movie Comparison with {getSelectedFriendName()}
            </Typography>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => fetchCombinedPreferences(Number(selectedFriendId))}
              disabled={loadingComparison}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {loadingComparison && moviesWithPreferences.length === 0 ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {moviesWithPreferences.length > 0 ? (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom align="center">
                    Movies You Both Rated
                  </Typography>

                  <List sx={{border:'1px solid red', height: '400px', overflow: 'auto'}}>
                    {moviesWithPreferences.slice(0, displayCount).map((item, index) => {
                      // If this item hasn't started loading yet, trigger the load
                      if (!item.isLoading && !item.movieDetails && !item.error) {
                        // Use setTimeout to avoid too many simultaneous API calls
                        setTimeout(() => loadMovieDetails(index), index * 100);
                      }
                      
                      return (
                        <MoviePreviewItem
                          item={item}
                        />
                      );
                    })}
                  </List>
                  
                  {hasMoreItems && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 1 }}>
                      <Button
                        variant="outlined"
                        endIcon={<ExpandMoreIcon />}
                        onClick={handleLoadMore}
                      >
                        Load More Movies
                      </Button>
                    </Box>
                  )}
                </>
              ) : (
                <Alert severity="info">
                  No movie preferences found to compare. Try rating some movies!
                </Alert>
              )}
            </>
          )}
        </>
      )}
    </Paper>
  );
};

export default FriendMovieComparison;