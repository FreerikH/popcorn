from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field

try:
    from .auth import get_current_active_user, User, Token, UserCreate, auth_service
    from .service import get_service, Service
except:
    from auth import get_current_active_user, User, Token, UserCreate, auth_service
    from service import get_service, Service

# Create an API router with a prefix
router = APIRouter(prefix="/api")

# Models
class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    
    class Config:
        orm_mode = True

# Friend-related models
class FriendRequest(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    status: str
    created_at: str
    
    class Config:
        orm_mode = True

class FriendRequestCreate(BaseModel):
    receiver_id: int

class FriendRequestUpdate(BaseModel):
    status: str

class Friend(BaseModel):
    id: int
    user: User
    friend_since: str
    
    class Config:
        orm_mode = True

class MoviePreference(BaseModel):
    movie_id: int
    rating: int

class MoviePreferenceResponse(BaseModel):
    movie_id: int
    rating: int
    created_at: Optional[str] = None
    
    class Config:
        orm_mode = True

# Combined preferences model
class CombinedPreferenceResponse(BaseModel):
    movie_id: int
    user1_rating: Optional[int] = None
    user2_rating: Optional[int] = None
    ratingDate: Optional[str] = None
    
    class Config:
        orm_mode = True

# Auth routes
@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """Register a new user"""
    new_user = auth_service.create_user(user.name, user.email, user.password, user.avatar)
    
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Remove the hashed_password from the response
    if hasattr(new_user, "hashed_password"):
        delattr(new_user, "hashed_password")
    
    return new_user

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Generate an access token for authentication"""
    token_data = auth_service.login(form_data.username, form_data.password)
    return token_data

@router.get("/users/me", response_model=User)
async def read_users_me(user: Service = Depends(get_current_active_user)):
    return user

# User search route
@router.get("/users", response_model=List[User])
async def search_users(
    q: Optional[str] = Query(None, description="Search query for name or email"),
    service: Service = Depends(get_service)
):
    """
    Search for users by name or email using a simple query parameter
    Example: /api/users?q=john
    """
    # If no query provided, return an empty list
    if not q:
        return []
    
    # Search for users with the provided query
    users = service.search_users(q)
    
    return users

# Friend request endpoints
@router.post("/friends/requests", status_code=status.HTTP_201_CREATED)
async def create_friend_request(
    request: FriendRequestCreate,
    service: Service = Depends(get_service)
):
    """Send a friend request to another user"""
    result = service.create_friend_request(request.receiver_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request could not be created. It may already exist."
        )
    
    return {"message": "Friend request sent successfully"}

@router.get("/friends/requests/incoming", response_model=List[Dict[str, Any]])
async def get_incoming_friend_requests(service: Service = Depends(get_service)):
    """Get list of incoming friend requests for the current user"""
    return service.get_incoming_requests()

@router.get("/friends/requests/outgoing", response_model=List[Dict[str, Any]])
async def get_outgoing_friend_requests(service: Service = Depends(get_service)):
    """Get list of outgoing friend requests from the current user"""
    return service.get_outgoing_requests()

@router.post("/friends/requests/{request_id}", status_code=status.HTTP_200_OK)
async def update_friend_request(
    request_id: int,
    update: FriendRequestUpdate,
    service: Service = Depends(get_service)
):
    """Accept or reject a friend request"""
    if update.status not in ["accepted", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'accepted' or 'rejected'"
        )
    
    result = service.update_friend_request(request_id, update.status)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or you're not authorized to update it"
        )
    
    return {"message": f"Friend request {update.status}"}

@router.delete("/friends/requests/{request_id}", status_code=status.HTTP_200_OK)
async def cancel_friend_request(
    request_id: int,
    service: Service = Depends(get_service)
):
    """Cancel an outgoing friend request"""
    result = service.cancel_friend_request(request_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or you're not authorized to cancel it"
        )
    
    return {"message": "Friend request cancelled"}

# Friends management endpoints
@router.get("/friends", response_model=List[Dict[str, Any]])
async def get_friends(service: Service = Depends(get_service)):
    """Get list of friends for the current user"""
    return service.get_friends()

@router.delete("/friends/{friend_id}", status_code=status.HTTP_200_OK)
async def remove_friend(
    friend_id: int,
    service: Service = Depends(get_service)
):
    """Remove a friend connection"""
    result = service.remove_friend(friend_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend connection not found"
        )
    
    return {"message": "Friend removed successfully"}

# Movie endpoints
@router.get('/movies')
async def get_movie(
    results: int = 1,
    ignore: str = '',
    movie_id: int = None,
    movie_ids: int = None,
    service: Service = Depends(get_service)
):
    if movie_id:
        result = service.get_movie(movie_id)
        return result
    if movie_ids != '' and not movie_ids is None:
        movie_ids_list = [int(i) for i in movie_ids.split(',') if i != '']
        result = service.get_movies(movie_ids_list)
        return result
    """Get one or more random movies not previously rated by the user"""
    ignore_list = [int(i) for i in ignore.split(',') if i != '']
    result = service.get_random_movies(results, ignore_list)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch movie"
        )
    
    # Return just the first movie if only one result
    #if results == 1:
    #    return result[0]
    return result

@router.post('/movies/preferences')
async def set_movie_preference(
    preference: MoviePreference,
    service: Service = Depends(get_service)
):
    """Create or update a movie preference"""
    result = service.set_movie_preference(preference.movie_id, preference.rating)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save preference"
        )
    
    return {"message": "Preference saved successfully"}

@router.get("/movies/preferences", response_model=List[Dict[str, Any]])
async def get_user_preferences(service: Service = Depends(get_service)):
    """Get all movie preferences for the current user"""
    return service.get_user_preferences()

@router.get('/movies/preferences/combined/{user_id}')
async def get_combined_preferences(
    user_id: int,
    service: Service = Depends(get_service)
):
    """
    Get combined movie preferences for the current user and another user.
    Shows movies that match between the two users with their ratings.
    """
    # Check if the specified user exists and is a friend
    friends = service.get_friends()
    is_friend = any(friend.get("user", {}).get("id") == user_id for friend in friends)
    
    if not is_friend:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view combined preferences with your friends"
        )
    
    result = service.get_combined_preferences(user_id)
    
    if not result:
        return []
    
    return result

@router.get("/movies/random", status_code=status.HTTP_200_OK)
async def get_random_movie(service: Service = Depends(get_service)):
    """Get a random movie"""
    result = service.get_random_movies(1)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch random movie"
        )
    
    return result[0]