import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Divider,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Badge,
  CircularProgress
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckIcon from '@mui/icons-material/Check';
//import { useNavigate } from 'react-router-dom';

// Import our contexts
import { useAuth, User } from '../contexts/AuthContext';
import { useApi } from '../contexts/ApiContext';

// Define types for this component
interface Friend {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface FriendRequest {
  id: number;
  sender_name: string;
  created_at: string;
}

interface SearchResult {
  id: number;
  name: string;
  email: string;
}

const DashboardPage = () => { 
  // Use our contexts
  const { user: authUser } = useAuth();
  const { apiGet, apiPost, loading: apiLoading, error: apiError } = useApi();
  
  // Local state
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{open: boolean, message: string, severity: 'success' | 'error'}>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [tabIndex, setTabIndex] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);

  //const navigate = useNavigate();

  // Use the authenticated user from context
  useEffect(() => {
    if (authUser) {
      setUser(authUser);
    }
  }, [authUser]);

  // Fetch user data when authenticated
  useEffect(() => {
    // Only fetch friends and requests when we have a user
    if (user) {
      const fetchUserData = async () => {
        try {
          // Fetch friends
          await fetchFriends();
          
          // Fetch friend requests
          await fetchFriendRequests();
        } catch (err) {
          console.error("Error fetching user data:", err);
          setError("Failed to load user data. Please try again.");
        }
      };
      
      fetchUserData();
    }
  }, [user]);

  // Update local error state if API errors occur
  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  // Fetch friends list
  const fetchFriends = async () => {
    try {
      const data = await apiGet<{ friends: Friend[] }>('api/friends');
      setFriends(data.friends || []);
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  // Fetch friend requests
  const fetchFriendRequests = async () => {
    try {
      const data = await apiGet<{ requests: FriendRequest[] }>('api/friends/requests');
      setFriendRequests(data.requests || []);
    } catch (err) {
      console.error("Error fetching friend requests:", err);
    }
  };

  // Handle search input change
  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
  
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
  
    try {
      setSearchLoading(true);
      const data = await apiGet<{ results: SearchResult[] }>(`api/users/search?query=${encodeURIComponent(value)}`);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Send a friend request
  const handleAddFriend = async (userId: number) => {
    try {
      await apiPost<{ success: boolean }>('api/friends/request', { userId });
      
      setNotification({
        open: true,
        message: 'Friend request sent!',
        severity: 'success'
      });
      
      // Remove user from search results to prevent duplicate requests
      setSearchResults(prevResults => 
        prevResults.filter(user => user.id !== userId)
      );
    } catch (err) {
      setNotification({
        open: true,
        message: err instanceof Error ? err.message : 'Error sending friend request',
        severity: 'error'
      });
    }
  };

  // Accept a friend request
  const handleAcceptFriend = async (requestId: number) => {
    try {
      await apiPost<{ success: boolean }>('api/friends/accept', { requestId });
      
      setNotification({
        open: true,
        message: 'Friend request accepted!',
        severity: 'success'
      });
      
      // Refresh friends and requests lists
      await fetchFriends();
      await fetchFriendRequests();
    } catch (err) {
      setNotification({
        open: true,
        message: err instanceof Error ? err.message : 'Error accepting friend request',
        severity: 'error'
      });
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    console.log(event);
    setTabIndex(newValue);
  };

  // Show loading state if API is loading
  if (apiLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', p: 2 }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 4, px: 2, bgcolor: 'secondary.main', minHeight: 'calc(100vh - 50px)' }}>
      <Container maxWidth="lg">
        <Typography variant="h4" component="h1" gutterBottom color="primary.main">
          Welcome back, {user?.name || 'User'}!
        </Typography>

        <Typography variant="body1" paragraph color="primary.main">
          Here's a summary of your movie ratings and recommendations.
        </Typography>

        {/* Friends Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">Your Friends</Typography>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Search for users"
                variant="outlined"
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{ mb: 2 }}
              />
              {searchLoading && (
                <CircularProgress
                  size={24}
                  sx={{
                    position: 'absolute',
                    right: 14,
                    top: 14,
                    color: 'primary.main'
                  }}
                />
              )}
            </Box>
            
            {searchResults.length > 0 && (
              <List dense>
                {searchResults.map((user) => (
                  <ListItem key={user.id} secondaryAction={
                    <IconButton edge="end" onClick={() => handleAddFriend(user.id)}>
                      <PersonAddIcon />
                    </IconButton>
                  }>
                    <ListItemText 
                      primary={user.name} 
                      secondary={user.email}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              sx={{ mb: 2 }}
            >
              <Tab label="Friends" />
              <Tab 
                label={
                  <Badge 
                    badgeContent={friendRequests.length} 
                    color="primary"
                    invisible={friendRequests.length === 0}
                  >
                    Friend Requests
                  </Badge>
                } 
              />
            </Tabs>
            
            {tabIndex === 0 && (
              <>
                <List dense>
                  {friends.map((friend) => (
                    <ListItem key={friend.id}>
                      <ListItemText 
                        primary={friend.name} 
                        secondary={
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                            {friend.avatar && (
                              <Box 
                                sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%', 
                                  bgcolor: 'primary.main',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mr: 1
                                }}
                              >
                                {friend.avatar}
                              </Box>
                            )}
                            Friend
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                  {friends.length === 0 && (
                    <Typography variant="body2">
                      You don't have any friends yet. Use the search box above to find users.
                    </Typography>
                  )}
                </List>
              </>
            )}
            
            {tabIndex === 1 && (
              <>
                <List dense>
                  {friendRequests.map((request) => (
                    <ListItem key={request.id} secondaryAction={
                      <IconButton edge="end" onClick={() => handleAcceptFriend(request.id)}>
                        <CheckIcon />
                      </IconButton>
                    }>
                      <ListItemText 
                        primary={request.sender_name} 
                        secondary={`Sent ${new Date(request.created_at).toLocaleDateString()}`}
                      />
                    </ListItem>
                  ))}
                  {friendRequests.length === 0 && (
                    <Typography variant="body2">
                      You don't have any pending friend requests.
                    </Typography>
                  )}
                </List>
              </>
            )}
          </Paper>
        </Box>
      </Container>
      
      {/* Notification */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DashboardPage;