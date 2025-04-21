#routes.py
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
try:
    from .auth import get_current_active_user, User, Token
    from .services import (
        login_service, 
        create_user_service, 
        search_users_service ,
        get_friends_service,
        create_friend_request_service,
        get_incoming_requests_service,
        update_friend_request_service,
        get_outgoing_requests_service,
        cancel_friend_request_service,
        remove_friend_service,
        get_movie_service, update_preference_service, get_user_preferences_service, get_combined_preferences_service  
    )
except:
    from auth import get_current_active_user, User, Token
    from services import (
        login_service, 
        create_user_service, 
        search_users_service ,
        get_friends_service,
        create_friend_request_service,
        get_incoming_requests_service,
        update_friend_request_service,
        get_outgoing_requests_service,
        cancel_friend_request_service,
        remove_friend_service,
        get_movie_service, update_preference_service, get_user_preferences_service, get_combined_preferences_service  
    )

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

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    avatar: Optional[str] = None

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

@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    # Call the existing create_user_service
    new_user = create_user_service(user.name, user.email, user.password, user.avatar)
    
    if not new_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Remove the hashed_password from the response
    if hasattr(new_user, "hashed_password"):
        delattr(new_user, "hashed_password")
    
    return new_user

# Auth routes
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    token_data = login_service(form_data.username, form_data.password)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token_data

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user


@router.get("/users", response_model=List[User])
async def search_users(
    q: Optional[str] = Query(None, description="Search query for name or email"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Search for users by name or email using a simple query parameter
    Example: /api/users?q=john
    """
    # If no query provided, return an empty list
    if not q:
        return []
    
    # Search for users with the provided query
    users = search_users_service(q)
    
    # returns list of dicts [{id:1, name:A, email:a@b.de}, ...]
    return users

# Friend request endpoints
@router.post("/friends/requests", status_code=status.HTTP_201_CREATED)
async def create_friend_request(
    request: FriendRequestCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Send a friend request to another user"""
    result = create_friend_request_service(current_user.id, request.receiver_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Friend request could not be created. It may already exist."
        )
    
    return {"message": "Friend request sent successfully"}

@router.get("/friends/requests/incoming", response_model=List[Dict[str, Any]])
async def get_incoming_friend_requests(
    current_user: User = Depends(get_current_active_user)
):
    """Get list of incoming friend requests for the current user"""
    requests = get_incoming_requests_service(current_user.id)
    return requests

@router.get("/friends/requests/outgoing", response_model=List[Dict[str, Any]])
async def get_outgoing_friend_requests(
    current_user: User = Depends(get_current_active_user)
):
    """Get list of outgoing friend requests from the current user"""
    requests = get_outgoing_requests_service(current_user.id)
    return requests

@router.post("/friends/requests/{request_id}", status_code=status.HTTP_200_OK)
async def update_friend_request(
    request_id: int,
    update: FriendRequestUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Accept or reject a friend request"""
    if update.status not in ["accepted", "rejected"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'accepted' or 'rejected'"
        )
    
    result = update_friend_request_service(request_id, current_user.id, update.status)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or you're not authorized to update it"
        )
    
    return {"message": f"Friend request {update.status}"}

@router.delete("/friends/requests/{request_id}", status_code=status.HTTP_200_OK)
async def cancel_friend_request(
    request_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Cancel an outgoing friend request"""
    result = cancel_friend_request_service(request_id, current_user.id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend request not found or you're not authorized to cancel it"
        )
    
    return {"message": "Friend request cancelled"}

# Friends management endpoints
@router.get("/friends", response_model=List[Dict[str, Any]])
async def get_friends(
    current_user: User = Depends(get_current_active_user)
):
    """Get list of friends for the current user"""
    friends_list = get_friends_service(current_user.id)
    return friends_list

@router.delete("/friends/{friend_id}", status_code=status.HTTP_200_OK)
async def remove_friend(
    friend_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Remove a friend connection"""
    result = remove_friend_service(current_user.id, friend_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Friend connection not found"
        )
    
    return {"message": "Friend removed successfully"}


# Add these imports to your routes.py file
from typing import Optional, List
from fastapi import Path, Body
from pydantic import BaseModel, Field


# Add these models to your routes.py file

class MoviePreference(BaseModel):
    movie_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")

class MoviePreferenceResponse(BaseModel):
    movie_id: int
    rating: int
    created_at: Optional[str] = None
    
    class Config:
        orm_mode = True

# Add these routes to your router in routes.py

@router.get("/movies", status_code=status.HTTP_200_OK)
async def get_movie(
    movie_id: Optional[int] = Query(None, description="Movie ID (random if not provided)"),
    current_user: User = Depends(get_current_active_user)
):
    """Get movie details from external API"""
    result = get_movie_service(movie_id)
   
    if result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Failed to fetch movie data")
        )
   
    return result #result.get("data")

@router.post("/movies/preferences", status_code=status.HTTP_201_CREATED)
async def create_movie_preference(
    preference: MoviePreference,
    current_user: User = Depends(get_current_active_user)
):
    """Create or update a movie preference"""
    result = update_preference_service(current_user.id, preference.movie_id, preference.rating)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save preference"
        )
    
    return {"message": "Preference saved successfully"}

@router.get("/movies/preferences", response_model=List[MoviePreferenceResponse])
async def get_user_preferences(
    current_user: User = Depends(get_current_active_user)
):
    """Get all movie preferences for the current user"""
    preferences = get_user_preferences_service(current_user.id)
    
    # Format the response
    formatted_preferences = []
    for pref in preferences:
        created_at = pref.get("created_at")
        formatted_preferences.append({
            "movie_id": pref["movie_id"],
            "rating": pref["rating"],
            "created_at": created_at.isoformat() if created_at else None
        })
    
    return formatted_preferences

@router.get("/movies/random", status_code=status.HTTP_200_OK)
async def get_random_movie(
    current_user: User = Depends(get_current_active_user)
):
    """Get a random movie from the external API"""
    result = get_movie_service()  # No ID means random
    
    if result.get("status") == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Failed to fetch random movie")
        )
    
    return result.get("data")

# Then, add a new model for the combined preferences response
class CombinedPreferenceResponse(BaseModel):
    movie_id: int
    user1_rating: Optional[int] = None
    user2_rating: Optional[int] = None
    ratingDate: Optional[str] = None
    
    class Config:
        orm_mode = True

# Finally, add the new route
@router.get("/movies/preferences/combined/{user_id}", response_model=List[CombinedPreferenceResponse])
async def get_combined_preferences(
    user_id: int = Path(..., description="ID of the user to compare preferences with"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get combined movie preferences for the current user and another user.
    This shows movies that either user has rated, with both ratings when available.
    """
    # Check if the specified user exists and is a friend
    friends = get_friends_service(current_user.id)
    is_friend = any(friend.get("user", {}).get("id") == user_id for friend in friends)
    
    if not is_friend:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view combined preferences with your friends"
        )
    
    # Get the combined preferences
    combined_preferences = get_combined_preferences_service(current_user.id, user_id)
    
    return combined_preferences