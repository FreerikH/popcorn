#services.py
from datetime import timedelta
from typing import List, Dict, Any, Optional
import os
import random
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

try:
    from .auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_user
    from .database import DB
except:
    from auth import authenticate_user, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_user
    from database import DB

# Initialize database connection
db = DB()

# Authentication service
def login_service(email: str, password: str):
    user = authenticate_user(email, password)
    if not user:
        return None
   
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User management services
def create_user_service(name: str, email: str, password: str, avatar: Optional[str] = None):
    from auth import create_user
    return create_user(name, email, password, avatar)

def update_user_service(user_id: int, update_data: Dict[str, Any]):
    from auth import update_user
    return update_user(user_id, update_data)

def get_user_by_email_service(email: str):
    return get_user(email)


def search_users_service(query: str) -> List[Dict[str, Any]]:
    # Add wildcards for ILIKE query (case insensitive)
    query = f"%{query}%"
    
    # Search in both name and email fields
    sql = "SELECT id, name, email FROM users WHERE email ILIKE :q OR name ILIKE :q"
    params = {"q": query}
    
    # Execute the query and return results
    users = db.execute(sql, params)
    return users

# Friend request services
def create_friend_request_service(sender_id: int, receiver_id: int) -> bool:
    # Check if users exist
    sender = db.execute("SELECT id FROM users WHERE id = :id", {"id": sender_id})
    receiver = db.execute("SELECT id FROM users WHERE id = :id", {"id": receiver_id})
    
    if not sender or not receiver:
        return False
    
    # Check if they're already friends
    existing_friendship = db.execute(
        """
        SELECT id FROM friends 
        WHERE (user_id1 = :user1 AND user_id2 = :user2) 
        OR (user_id1 = :user2 AND user_id2 = :user1)
        """,
        {"user1": sender_id, "user2": receiver_id}
    )
    
    if existing_friendship:
        return False
    
    # Check if there's already a pending request
    existing_request = db.execute(
        """
        SELECT id FROM friend_requests 
        WHERE (sender_id = :sender AND receiver_id = :receiver)
        OR (sender_id = :receiver AND receiver_id = :sender)
        AND status = 'pending'
        """,
        {"sender": sender_id, "receiver": receiver_id}
    )
    
    if existing_request:
        return False
    
    # Create the friend request
    result = db.execute(
        """
        INSERT INTO friend_requests (sender_id, receiver_id, status, created_at)
        VALUES (:sender, :receiver, 'pending', CURRENT_TIMESTAMP)
        RETURNING id
        """,
        {"sender": sender_id, "receiver": receiver_id},
        False
    )
    
    return bool(result)

def get_incoming_requests_service(user_id: int) -> List[Dict[str, Any]]:
    requests = db.execute(
        """
        SELECT fr.id, fr.sender_id, fr.status, fr.created_at,
               u.id as user_id, u.name, u.email
        FROM friend_requests fr
        JOIN users u ON fr.sender_id = u.id
        WHERE fr.receiver_id = :user_id AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
        """,
        {"user_id": user_id}
    )
    
    # Format the response
    formatted_requests = []
    for req in requests:
        formatted_requests.append({
            "id": req["id"],
            "sender": {
                "id": req["user_id"],
                "name": req["name"],
                "email": req["email"]
            },
            "status": req["status"],
            "createdAt": req["created_at"].isoformat() if req["created_at"] else None
        })
    
    return formatted_requests

def get_outgoing_requests_service(user_id: int) -> List[Dict[str, Any]]:
    requests = db.execute(
        """
        SELECT fr.id, fr.receiver_id, fr.status, fr.created_at,
               u.id as user_id, u.name, u.email
        FROM friend_requests fr
        JOIN users u ON fr.receiver_id = u.id
        WHERE fr.sender_id = :user_id AND fr.status = 'pending'
        ORDER BY fr.created_at DESC
        """,
        {"user_id": user_id}
    )
    
    # Format the response
    formatted_requests = []
    for req in requests:
        formatted_requests.append({
            "id": req["id"],
            "sender": {
                "id": req["user_id"],
                "name": req["name"],
                "email": req["email"]
            },
            "status": req["status"],
            "createdAt": req["created_at"].isoformat() if req["created_at"] else None
        })
    
    return formatted_requests

def update_friend_request_service(request_id: int, user_id: int, status: str) -> bool:
    # Verify the request exists and is directed to this user
    request = db.execute(
        """
        SELECT id, sender_id, receiver_id FROM friend_requests
        WHERE id = :request_id AND receiver_id = :user_id AND status = 'pending'
        """,
        {"request_id": request_id, "user_id": user_id}
    )
    
    if not request:
        return False
    
    # Update the request status
    db.execute(
        """
        UPDATE friend_requests
        SET status = :status
        WHERE id = :request_id
        """,
        {"status": status, "request_id": request_id},
        False
    )
    
    # If accepted, create a friendship
    if status == "accepted":
        sender_id = request[0]["sender_id"]
        db.execute(
            """
            INSERT INTO friends (user_id1, user_id2, created_at)
            VALUES (:user1, :user2, CURRENT_TIMESTAMP)
            """,
            {"user1": user_id, "user2": sender_id},
            False
        )
    
    return True

def cancel_friend_request_service(request_id: int, user_id: int) -> bool:
    # Verify the request exists and was sent by this user
    request = db.execute(
        """
        SELECT id FROM friend_requests
        WHERE id = :request_id AND sender_id = :user_id AND status = 'pending'
        """,
        {"request_id": request_id, "user_id": user_id}
    )
    
    if not request:
        return False
    
    # Delete the request
    db.execute(
        """
        DELETE FROM friend_requests
        WHERE id = :request_id
        """,
        {"request_id": request_id},
        False
    )
    
    return True

def get_friends_service(user_id: int) -> List[Dict[str, Any]]:
    friends = db.execute(
        """
        SELECT f.id, f.created_at as friend_since,
               u.id as user_id, u.name, u.email
        FROM friends f
        JOIN users u ON 
            CASE
                WHEN f.user_id1 = :user_id THEN u.id = f.user_id2
                ELSE u.id = f.user_id1
            END
        WHERE f.user_id1 = :user_id OR f.user_id2 = :user_id
        ORDER BY f.created_at DESC
        """,
        {"user_id": user_id}
    )
    
    # Format the response
    formatted_friends = []
    for friend in friends:
        formatted_friends.append({
            "id": friend["id"],
            "user": {
                "id": friend["user_id"],
                "name": friend["name"],
                "email": friend["email"]
            },
            "friendSince": friend["friend_since"].isoformat() if friend["friend_since"] else None
        })
    
    return formatted_friends

def remove_friend_service(user_id: int, friend_id: int) -> bool:
    # Get the friend connection
    friendship = db.execute(
        """
        SELECT id FROM friends
        WHERE id = :friend_id AND (user_id1 = :user_id OR user_id2 = :user_id)
        """,
        {"friend_id": friend_id, "user_id": user_id}
    )
    
    if not friendship:
        return False
    
    # Remove the friendship
    db.execute(
        """
        DELETE FROM friends
        WHERE id = :friend_id
        """,
        {"friend_id": friend_id},
        False
    )
    
    return True



# Add these imports to your services.py file
import os
import random
import requests
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Movie API service
class MovieAPI:
    """API client for external movie data source."""
    
    def __init__(self):
        self.movie_url = 'https://api.themoviedb.org/3/movie/'
        self.image_url = 'https://image.tmdb.org/t/p/original/'
        self.headers = {
            'Authorization': 'Bearer ' + os.getenv('TMDB_BEARER_TOKEN')
        }
    
    def get_movie(self, movie_id=None):
        """
        Get movie data from external API.
    
        Args:
            movie_id: Optional movie ID, random if not provided
        
        Returns:
            Movie data dictionary
        """
        import time
        
        # If no movie_id is provided, try up to 10 random IDs
        if movie_id is None:
            attempts = 0
            max_attempts = 10
            
            while attempts < max_attempts:
                movie_id = random.randint(1, 10000)
                
                url = self.movie_url + str(movie_id)
                
                try:
                    response = requests.get(url, headers=self.headers)
                    response_json = response.json()
                    
                    if response.status_code == 200:
                        # Resolve poster path URL
                        if response_json.get('poster_path'):
                            response_json['poster_path'] = self.image_url + response_json['poster_path']
                        
                        return response_json
                    
                    # If this random ID failed, log and try again
                    attempts += 1
                    
                    if attempts < max_attempts:
                        time.sleep(1)  # Wait 1 second before next attempt
                    
                except Exception as e:
                    attempts += 1
                    
                    if attempts < max_attempts:
                        time.sleep(1)  # Wait 1 second before next attempt
            
            # If all attempts failed
            return {"status": "error", "message": "Failed to fetch random movie data after 10 attempts"}
        
        # If a specific movie_id is provided, just try once
        else:
            url = self.movie_url + str(movie_id)
            
            try:
                response = requests.get(url, headers=self.headers)
                response_json = response.json()
                
                if response.status_code != 200:
                    return {"status": "error", "message": "Failed to fetch movie data"}
                    
                # Resolve poster path URL
                if response_json.get('poster_path'):
                    response_json['poster_path'] = self.image_url + response_json['poster_path']
                
                return response_json
                
            except Exception as e:
                return {"status": "error", "message": "Failed to fetch movie data"}

# Initialize the API client
movie_api = MovieAPI()

# Movie services
def get_movie_service(movie_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Get movie data from external API.
    
    Args:
        movie_id: Optional movie ID, random if not provided
        
    Returns:
        Movie data response
    """
    return movie_api.get_movie(movie_id)

def update_preference_service(user_id: int, movie_id: int, rating: int) -> bool:
    """
    Update user movie preferences.
    
    Args:
        user_id: User ID
        movie_id: Movie ID
        rating: User rating for the movie
        
    Returns:
        Success status
    """
    data = {
        "user_id": user_id,
        "movie_id": movie_id,
        "rating": rating
    }
    
    # Insert or update the preference
    sql = '''
        INSERT INTO preferences (
            user_id,
            movie_id,
            rating
        ) VALUES (
            :user_id,
            :movie_id,
            :rating
        )
        /*ON CONFLICT (user_id, movie_id) 
        DO UPDATE SET rating = :rating*/
    '''
    
    try:
        db.execute(sql, data, False)
        return True
    except Exception as e:
        return False

def get_user_preferences_service(user_id: int) -> List[Dict[str, Any]]:
    """
    Get all preferences for a user.
    
    Args:
        user_id: User ID
        
    Returns:
        List of preference dictionaries
    """
    sql = '''
        SELECT 
            p.movie_id, 
            p.rating, 
            p.created_at
        FROM preferences p
        WHERE p.user_id = :user_id
        ORDER BY p.created_at DESC
    '''
    
    preferences = db.execute(sql, {"user_id": user_id})
    return preferences

def get_combined_preferences_service(user_id1: int, user_id2: int) -> List[Dict[str, Any]]:
    """
    Get combined movie preferences for two users.
    
    Args:
        user_id1: First user ID
        user_id2: Second user ID
        
    Returns:
        List of movies with ratings from both users when available
    """
    sql = '''
        SELECT 
            m.movie_id,
            u1.rating AS user1_rating,
            u2.rating AS user2_rating,
            GREATEST(u1.created_at, u2.created_at) AS latest_rating_date
        FROM (
            SELECT DISTINCT movie_id
            FROM preferences
            WHERE user_id = :user_id1 OR user_id = :user_id2
        ) m
        LEFT JOIN (
            SELECT movie_id, rating, created_at
            FROM preferences
            WHERE user_id = :user_id1
        ) u1 ON m.movie_id = u1.movie_id
        LEFT JOIN (
            SELECT movie_id, rating, created_at
            FROM preferences
            WHERE user_id = :user_id2
        ) u2 ON m.movie_id = u2.movie_id
        ORDER BY latest_rating_date DESC
    '''
    
    combined_preferences = db.execute(sql, {
        "user_id1": user_id1, 
        "user_id2": user_id2
    })
    
    # Format the response
    formatted_preferences = []
    for pref in combined_preferences:
        formatted_preferences.append({
            "movie_id": pref["movie_id"],
            "user1_rating": pref["user1_rating"],
            "user2_rating": pref["user2_rating"],
            "ratingDate": pref["latest_rating_date"].isoformat() if pref["latest_rating_date"] else None
        })
    
    return formatted_preferences