import React, { useState, useEffect } from 'react';
import { useApi } from '../contexts/ApiContext';
import {
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment
} from '@mui/material';
import {
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  PersonRemove as PersonRemoveIcon
} from '@mui/icons-material';

interface User {
  id: number;
  name: string;
  email: string;
}

interface FriendRequest {
  id: number;
  sender: User;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

interface Friend {
  id: number;
  user: User;
  friendSince: string;
}

// Tab Panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`friends-tabpanel-${index}`}
      aria-labelledby={`friends-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const FriendsManagement: React.FC = () => {
  const api = useApi();
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  
  // Friend requests state
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    event;
    setTabValue(newValue);
  };

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const data = await api.get<User[]>(`/users?q=${encodeURIComponent(searchQuery)}`);
      
      // Filter out users that already have pending requests or are already friends
      const existingUserIds = new Set([
        ...outgoingRequests.map(req => req.sender.id),
        ...friends.map(friend => friend.user.id)
      ]);
      
      const filteredResults = data.filter(user => !existingUserIds.has(user.id));
      setSearchResults(filteredResults);
    } catch (err) {
      setError('Failed to search for users');
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (userId: number) => {
    try {
      await api.post('/friends/requests', { receiver_id: userId });
      
      // Remove from search results
      setSearchResults(searchResults.filter(user => user.id !== userId));
      
      // Refresh outgoing requests
      fetchFriendRequests();
    } catch (err) {
      setError('Failed to send friend request');
      console.error(err);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (requestId: number) => {
    try {
      await api.post(`/friends/requests/${requestId}`, { status: 'accepted' });
      
      // Refresh friends and requests
      fetchFriends();
      fetchFriendRequests();
    } catch (err) {
      setError('Failed to accept friend request');
      console.error(err);
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (requestId: number) => {
    try {
      await api.post(`/friends/requests/${requestId}`, { status: 'rejected' });
      
      // Refresh requests
      fetchFriendRequests();
    } catch (err) {
      setError('Failed to reject friend request');
      console.error(err);
    }
  };

  // Cancel outgoing friend request
  const cancelFriendRequest = async (requestId: number) => {
    try {
      await api.delete(`/friends/requests/${requestId}`);
      
      // Refresh outgoing requests
      fetchFriendRequests();
    } catch (err) {
      setError('Failed to cancel friend request');
      console.error(err);
    }
  };

  // Remove friend
  const removeFriend = async (friendId: number) => {
    try {
      await api.delete(`/friends/${friendId}`);
      
      // Refresh friends
      fetchFriends();
    } catch (err) {
      setError('Failed to remove friend');
      console.error(err);
    }
  };

  // Fetch friends
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

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    setLoadingRequests(true);
    setError(null);
    try {
      const incoming = await api.get<FriendRequest[]>('/friends/requests/incoming');
      const outgoing = await api.get<FriendRequest[]>('/friends/requests/outgoing');
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err) {
      setError('Failed to fetch friend requests');
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Friends Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="friends management tabs"
        >
          <Tab label="Find Friends" />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                Requests
                {incomingRequests.length > 0 && (
                  <Chip 
                    label={incomingRequests.length} 
                    color="primary" 
                    size="small" 
                    sx={{ ml: 1 }} 
                  />
                )}
              </Box>
            } 
          />
          <Tab label="My Friends" />
        </Tabs>
      </Box>

      {/* Find Friends Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{xs:12, sm:8}}>
              <TextField
                fullWidth
                label="Search for users"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </Grid>
            <Grid size={{xs:12, sm:4}}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                startIcon={isSearching ? <CircularProgress size={20} /> : <SearchIcon />}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </Grid>
          </Grid>
        </Box>

        {isSearching && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        )}

        {!isSearching && searchResults.length === 0 && searchQuery.trim() !== '' && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No users found matching "{searchQuery}"
          </Alert>
        )}

        {!isSearching && searchResults.length > 0 && (
          <List>
            {searchResults.map((user) => (
              <React.Fragment key={user.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>{user.name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary={user.email}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<PersonAddIcon />}
                      onClick={() => sendFriendRequest(user.id)}
                    >
                      Add Friend
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Friend Requests Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Friend Requests
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchFriendRequests}
            disabled={loadingRequests}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {loadingRequests && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        )}

        {!loadingRequests && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Incoming Requests
            </Typography>
            
            {incomingRequests.length === 0 ? (
              <Alert severity="info" sx={{ mb: 3 }}>No incoming friend requests</Alert>
            ) : (
              <List sx={{ mb: 4 }}>
                {incomingRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>{request.sender.name.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={request.sender.name}
                        secondary={
                          <>
                            {request.sender.email}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              component="span"
                              sx={{ display: 'block' }}
                            >
                              Sent on {new Date(request.createdAt).toLocaleDateString()}
                            </Typography>
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          aria-label="accept" 
                          onClick={() => acceptFriendRequest(request.id)}
                          color="primary"
                          sx={{ mr: 1 }}
                        >
                          <CheckIcon />
                        </IconButton>
                        <IconButton 
                          edge="end" 
                          aria-label="reject" 
                          onClick={() => rejectFriendRequest(request.id)}
                          color="error"
                        >
                          <CloseIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}

            <Typography variant="subtitle1" gutterBottom>
              Outgoing Requests
            </Typography>
            
            {outgoingRequests.length === 0 ? (
              <Alert severity="info">No outgoing friend requests</Alert>
            ) : (
              <List>
                {outgoingRequests.map((request) => (
                  <React.Fragment key={request.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar>{request.sender.name.charAt(0)}</Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={request.sender.name}
                        secondary={
                          <>
                            {request.sender.email}
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              component="span"
                              sx={{ display: 'block' }}
                            >
                              Sent on {new Date(request.createdAt).toLocaleDateString()}
                            </Typography>
                          </>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => cancelFriendRequest(request.id)}
                        >
                          Cancel
                        </Button>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
          </>
        )}
      </TabPanel>

      {/* Friends List Tab */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            My Friends
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={fetchFriends}
            disabled={loadingFriends}
            size="small"
          >
            Refresh
          </Button>
        </Box>

        {loadingFriends && (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress />
          </Box>
        )}

        {!loadingFriends && friends.length === 0 ? (
          <Alert severity="info">You haven't added any friends yet</Alert>
        ) : (
          <List>
            {friends.map((friend) => (
              <React.Fragment key={friend.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>{friend.user.name.charAt(0)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={friend.user.name}
                    secondary={
                      <>
                        {friend.user.email}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          sx={{ display: 'block' }}
                        >
                          Friends since {new Date(friend.friendSince).toLocaleDateString()}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      aria-label="remove friend" 
                      onClick={() => removeFriend(friend.id)}
                      color="error"
                    >
                      <PersonRemoveIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </TabPanel>
    </Paper>
  );
};

export default FriendsManagement;