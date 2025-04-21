import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import {
  Typography,
  Paper,
  Box,
  Grid,
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

interface CombinedPreference {
  movie_id: number;
  user1_rating: number | null;
  user2_rating: number | null;
  ratingDate: string;
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

  // Fetch combined preferences
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

  // Calculate compatibility score (percentage of movies where ratings are within 1 point)
  const calculateCompatibility = () => {
    if (combinedPreferences.length === 0) return 0;
    
    const sharedMovies = combinedPreferences.filter(
      pref => pref.user1_rating !== null && pref.user2_rating !== null
    );
    
    if (sharedMovies.length === 0) return 0;
    
    const compatibleMovies = sharedMovies.filter(
      pref => Math.abs((pref.user1_rating || 0) - (pref.user2_rating || 0)) <= 1
    );
    
    return Math.round((compatibleMovies.length / sharedMovies.length) * 100);
  };

  // Get friend name by ID
  const getSelectedFriendName = () => {
    const friend = friends.find(f => f.user.id === Number(selectedFriendId));
    return friend ? friend.user.name : 'Selected Friend';
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
                      Based on {combinedPreferences.filter(p => p.user1_rating !== null && p.user2_rating !== null).length} movies you've both rated
                    </Typography>
                  </Box>

                  <Grid container sx={{ mb: 2 }}>
                    <Grid size={{xs:6}} sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Your Rating
                      </Typography>
                    </Grid>
                    <Grid size={{xs:6}} sx={{ textAlign: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {getSelectedFriendName()}'s Rating
                      </Typography>
                    </Grid>
                  </Grid>

                  <List>
                    {combinedPreferences.map((pref) => {
                      const movie = moviesDetails.get(pref.movie_id);
                      const ratingDifference = 
                        pref.user1_rating !== null && pref.user2_rating !== null 
                          ? Math.abs(pref.user1_rating - pref.user2_rating) 
                          : null;
                      
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
                                  {ratingDifference !== null && (
                                    <Chip 
                                      label={ratingDifference <= 1 ? 'Match!' : `${ratingDifference} ★ apart`}
                                      color={ratingDifference <= 1 ? 'success' : ratingDifference <= 2 ? 'warning' : 'error'}
                                      size="small"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Grid container sx={{ mt: 1 }}>
                                  <Grid size={{xs:6}} sx={{ textAlign: 'center' }}>
                                    {pref.user1_rating !== null ? (
                                      <Rating value={pref.user1_rating} readOnly size="small" />
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        Not rated
                                      </Typography>
                                    )}
                                  </Grid>
                                  <Grid size={{xs:6}} sx={{ textAlign: 'center' }}>
                                    {pref.user2_rating !== null ? (
                                      <Rating value={pref.user2_rating} readOnly size="small" />
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        Not rated
                                      </Typography>
                                    )}
                                  </Grid>
                                </Grid>
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