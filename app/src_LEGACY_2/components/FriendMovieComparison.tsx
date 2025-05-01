import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import {
  Typography,
  Paper,
  Box,
  //Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Button,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import {
  Movie as MovieIcon,
  Refresh as RefreshIcon,
  Compare as CompareIcon
} from '@mui/icons-material';

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

// Updated interface to match new API response
interface CombinedPreference {
  movie_id: number;
  rating_combined: number;
  match: 'perfect' | 'partial' | 'mismatch'; // assuming these are the possible values
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

const FriendMovieComparison: React.FC = () => {
  const api = useApi();
  
  // State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  const [combinedPreferences, setCombinedPreferences] = useState<CombinedPreference[]>([]);
  const [moviesDetails, setMoviesDetails] = useState<Map<number, Movie>>(new Map());
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (value !== '') {
      fetchCombinedPreferences(Number(value));
    } else {
      setCombinedPreferences([]);
      setMoviesDetails(new Map());
    }
  };

  // Fetch combined preferences with the new API format
  const fetchCombinedPreferences = async (friendId: number) => {
    setLoadingComparison(true);
    setError(null);
    
    try {
      const data = await api.get<CombinedPreference[]>(`/movies/preferences/combined/${friendId}`);
      setCombinedPreferences(data);
      
      // Fetch movie details for each movie in the combined preferences
      const moviesMap = new Map<number, Movie>();
      
      for (const pref of data) {
        try {
          // Only fetch if we don't already have this movie's details
          if (!moviesMap.has(pref.movie_id)) {
            const movie = await api.get<Movie>(`/movies?movie_id=${pref.movie_id}`);
            moviesMap.set(pref.movie_id, movie);
          }
        } catch (err) {
          console.error(`Failed to fetch details for movie ${pref.movie_id}`, err);
        }
      }
      
      setMoviesDetails(moviesMap);
    } catch (err) {
      setError('Failed to fetch combined preferences');
      console.error(err);
    } finally {
      setLoadingComparison(false);
    }
  };

  // Calculate compatibility score based on the new format
  const calculateCompatibility = () => {
    if (combinedPreferences.length === 0) return 0;
    
    const perfectMatches = combinedPreferences.filter(pref => pref.match === 'perfect').length;
    const partialMatches = combinedPreferences.filter(pref => pref.match === 'partial').length;
    
    // Giving full weight to perfect matches and half weight to partial matches
    const score = (perfectMatches + (partialMatches * 0.5)) / combinedPreferences.length;
    return Math.round(score * 100);
  };

  // Get friend name by ID
  const getSelectedFriendName = () => {
    const friend = friends.find(f => f.user.id === Number(selectedFriendId));
    return friend ? friend.user.name : 'Selected Friend';
  };

  // Get chip color based on match status
  const getMatchChipColor = (match: string) => {
    switch (match) {
      case 'perfect': return 'success';
      case 'partial': return 'warning';
      default: return 'error';
    }
  };

  // Get match display text
  const getMatchDisplayText = (match: string) => {
    switch (match) {
      case 'perfect': return 'Perfect Match!';
      case 'partial': return 'Partial Match';
      default: return 'Mismatch';
    }
  };

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

          {loadingComparison ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {combinedPreferences.length > 0 ? (
                <>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant="h4" gutterBottom color="primary">
                      {calculateCompatibility()}% Compatible
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Based on {combinedPreferences.length} movies you've both rated
                    </Typography>
                  </Box>

                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom align="center">
                    Combined Ratings
                  </Typography>

                  <List>
                    {combinedPreferences.map((pref) => {
                      const movie = moviesDetails.get(pref.movie_id);
                      
                      return (
                        <React.Fragment key={pref.movie_id}>
                          <ListItem alignItems="flex-start">
                            <ListItemAvatar>
                              {movie && movie.poster_path ? (
                                <Avatar 
                                  alt={movie.title} 
                                  src={movie.poster_path} 
                                  variant="rounded"
                                  sx={{ width: 56, height: 56 }}
                                />
                              ) : (
                                <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
                                  <MovieIcon />
                                </Avatar>
                              )}
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <Typography variant="subtitle1">
                                    {movie ? movie.title : `Movie ID: ${pref.movie_id}`}
                                  </Typography>
                                  <Chip 
                                    label={getMatchDisplayText(pref.match)}
                                    color={getMatchChipColor(pref.match)}
                                    size="small"
                                  />
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                                  <Box>
                                    <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                                      Combined Rating
                                    </Typography>
                                    <Rating 
                                      value={pref.rating_combined / 2} // Assuming rating is out of 10, convert to out of 5 for Material UI Rating
                                      precision={0.5}
                                      readOnly 
                                      size="small" 
                                    />
                                    <Typography variant="body2" align="center">
                                      {pref.rating_combined.toFixed(1)}/10
                                    </Typography>
                                  </Box>
                                </Box>
                              }
                            />
                          </ListItem>
                          <Divider component="li" />
                        </React.Fragment>
                      );
                    })}
                  </List>
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