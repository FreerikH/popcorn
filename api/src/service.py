import os
import random
import requests
from typing import List, Dict, Any, Optional
import redis
from fastapi import Depends, HTTPException, status

try:
    from .auth import get_current_active_user, User, auth_service
    from .database import DB
    from .movies import Movies
except:
    from auth import get_current_active_user, User, auth_service
    from database import DB
    from movies import Movies

def get_service(current_user: User = Depends(get_current_active_user)):
    """Dependency to get service instance with authenticated user"""
    return Service(current_user)

class Service:
    def __init__(self, user):
        self.user = user
        self.db = DB()
        self._redis = None
        self._movies = None
        self.image_url = 'https://image.tmdb.org/t/p/original/'
    
    @property
    def redis(self):
        """Lazy initialization of Redis connection"""
        if self._redis is None:
            self._redis = redis.from_url(os.environ.get('REDIS_CONNECTION_STRING'))
        return self._redis
    
    @property
    def movies(self):
        """Lazy initialization of Movies instance"""
        if self._movies is None:
            self._movies = Movies(self.redis)
        return self._movies
    
    # ===== Friend Request Services =====
    
    def create_friend_request(self, receiver_id: int) -> bool:
        """Send a friend request to another user"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        sender_id = self.user.id
        
        # Check if users exist
        sender = self.db.execute("SELECT id FROM users WHERE id = :id", {"id": sender_id})
        receiver = self.db.execute("SELECT id FROM users WHERE id = :id", {"id": receiver_id})
        
        if not sender or not receiver:
            return False
        
        # Check if they're already friends
        existing_friendship = self.db.execute(
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
        existing_request = self.db.execute(
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
        result = self.db.execute(
            """
            INSERT INTO friend_requests (sender_id, receiver_id, status, created_at)
            VALUES (:sender, :receiver, 'pending', CURRENT_TIMESTAMP)
            RETURNING id
            """,
            {"sender": sender_id, "receiver": receiver_id},
            False
        )
        
        return bool(result)
    
    def get_incoming_requests(self) -> List[Dict[str, Any]]:
        """Get all incoming friend requests for the current user"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        requests = self.db.execute(
            """
            SELECT fr.id, fr.sender_id, fr.status, fr.created_at,
                   u.id as user_id, u.name, u.email
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            WHERE fr.receiver_id = :user_id AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
            """,
            {"user_id": self.user.id}
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
    
    def get_outgoing_requests(self) -> List[Dict[str, Any]]:
        """Get all outgoing friend requests for the current user"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        requests = self.db.execute(
            """
            SELECT fr.id, fr.receiver_id, fr.status, fr.created_at,
                   u.id as user_id, u.name, u.email
            FROM friend_requests fr
            JOIN users u ON fr.receiver_id = u.id
            WHERE fr.sender_id = :user_id AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
            """,
            {"user_id": self.user.id}
        )
        
        # Format the response
        formatted_requests = []
        for req in requests:
            formatted_requests.append({
                "id": req["id"],
                "receiver": {
                    "id": req["user_id"],
                    "name": req["name"],
                    "email": req["email"]
                },
                "status": req["status"],
                "createdAt": req["created_at"].isoformat() if req["created_at"] else None
            })
        
        return formatted_requests
    
    def update_friend_request(self, request_id: int, status: str) -> bool:
        """Accept or reject a friend request"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Verify the request exists and is directed to this user
        request = self.db.execute(
            """
            SELECT id, sender_id, receiver_id FROM friend_requests
            WHERE id = :request_id AND receiver_id = :user_id AND status = 'pending'
            """,
            {"request_id": request_id, "user_id": self.user.id}
        )
        
        if not request:
            return False
        
        # Update the request status
        self.db.execute(
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
            self.db.execute(
                """
                INSERT INTO friends (user_id1, user_id2, created_at)
                VALUES (:user1, :user2, CURRENT_TIMESTAMP)
                """,
                {"user1": self.user.id, "user2": sender_id},
                False
            )
        
        return True
    
    def cancel_friend_request(self, request_id: int) -> bool:
        """Cancel an outgoing friend request"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Verify the request exists and was sent by this user
        request = self.db.execute(
            """
            SELECT id FROM friend_requests
            WHERE id = :request_id AND sender_id = :user_id AND status = 'pending'
            """,
            {"request_id": request_id, "user_id": self.user.id}
        )
        
        if not request:
            return False
        
        # Delete the request
        self.db.execute(
            """
            DELETE FROM friend_requests
            WHERE id = :request_id
            """,
            {"request_id": request_id},
            False
        )
        
        return True
    
    def get_friends(self) -> List[Dict[str, Any]]:
        """Get all friends for the current user"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        friends = self.db.execute(
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
            {"user_id": self.user.id}
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
    
    def remove_friend(self, friend_id: int) -> bool:
        """Remove a friend connection"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Get the friend connection
        friendship = self.db.execute(
            """
            SELECT id FROM friends
            WHERE id = :friend_id AND (user_id1 = :user_id OR user_id2 = :user_id)
            """,
            {"friend_id": friend_id, "user_id": self.user.id}
        )
        
        if not friendship:
            return False
        
        # Remove the friendship
        self.db.execute(
            """
            DELETE FROM friends
            WHERE id = :friend_id
            """,
            {"friend_id": friend_id},
            False
        )
        
        return True
    
    def search_users(self, query: str) -> List[Dict[str, Any]]:
        """Search users by name or email"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        # Add wildcards for ILIKE query (case insensitive)
        query = f"%{query}%"
        
        # Search in both name and email fields
        sql = "SELECT id, name, email FROM users WHERE email ILIKE :q OR name ILIKE :q"
        params = {"q": query}
        
        # Execute the query and return results
        return self.db.execute(sql, params)
    
    # ===== Movie Services =====
    
    def get_random_movies(self, results=1, ignore = []):
        """Get random movies not previously rated by the user"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        sql = '''
            SELECT
                movie_id
            FROM
                preferences
            WHERE
                user_id = :user_id;
        '''
        params = {'user_id': self.user.id}
        result = self.db.execute(sql, params)
        previously_rated_ids = list(set([r['movie_id'] for r in result]))
        previously_rated_ids += ignore
        streaming_options = ['Netflix', 'Disney Plus', 'Amazon Prime Video']  # not yet implemented in db
        random_movies = self.movies.get_random_movies(previously_rated_ids, streaming_options, results=results)
        return random_movies
    
    def populate_movies_cache(self, results=1):
        
        streaming_options = ['Netflix', 'Disney Plus', 'Amazon Prime Video']

        sql = '''
            SELECT
                user_id,
                movie_id
            FROM
                preferences;
        '''
        result = self.db.execute(sql)

        requirements = {r['user_id']:{'previously_returned_movies': sorted([rr['movie_id'] for rr in result if rr['user_id'] == r['user_id']]), 'required_streaming_options' : streaming_options} for r in result}
        
        return self.movies.ensure_multiple_requirements([r for r in requirements.values()], 3)
    
    def get_movie(self, movie_id: int):
        """Get movie details by ID"""
        movie = self.movies.get_movie(movie_id)
        
        # Resolve poster path URL if needed
        if movie and movie.get('poster_path') and not movie['poster_path'].startswith('http'):
            movie['poster_path'] = self.image_url + movie['poster_path']
        
        return movie

    def get_movies(self, movie_ids: list[int]):
        """
        Get details for multiple movies by their IDs
        
        Args:
            movie_ids (list[int]): List of movie IDs to retrieve
            
        Returns:
            dict: Dictionary mapping movie IDs to their details with resolved poster paths
        """
        movies = self.movies.get_movies(movie_ids)
        
        # Resolve poster path URLs if needed
        for movie_id, movie in movies.items():
            if movie.get('poster_path') and not movie['poster_path'].startswith('http'):
                movie['poster_path'] = self.image_url + movie['poster_path']
        
        return movies
    
    def set_movie_preference(self, movie_id, rating):
        """Set user preference (rating) for a movie"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        sql = '''
            INSERT INTO preferences (
                user_id,
                movie_id,
                rating
            ) VALUES (
                :user_id,
                :movie_id,
                :rating
            );
        '''
        params = {
            "user_id": self.user.id,
            "movie_id": movie_id,
            "rating": rating
        }
        try:
            self.db.execute(sql, params, False)
            return True
        except Exception as e:
            return False
    
    def get_user_preferences(self) -> List[Dict[str, Any]]:
        """Get all movie preferences for the current user"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        sql = '''
            SELECT 
                p.movie_id, 
                p.rating, 
                p.created_at
            FROM preferences p
            WHERE p.user_id = :user_id
            ORDER BY p.created_at DESC
        '''
        
        preferences = self.db.execute(sql, {"user_id": self.user.id})
        
        # Format the response
        formatted_preferences = []
        for pref in preferences:
            formatted_preferences.append({
                "movie_id": pref["movie_id"],
                "rating": pref["rating"],
                "ratingDate": pref["created_at"].isoformat() if pref["created_at"] else None
            })
        
        return formatted_preferences
    
    def get_combined_preferences(self, second_user_id):
        """Get combined movie preferences for current user and a friend"""
        if not self.user:
            raise HTTPException(status_code=401, detail="Authentication required")
            
        sql = '''
            SELECT DISTINCT
                preferences.movie_id,
                AVG(preferences.rating) + AVG(preferences_2.rating) AS rating_combined,
                CASE
                    WHEN AVG(preferences.rating) + AVG(preferences_2.rating) >= 6 THEN 'perfect'
                    WHEN AVG(preferences.rating) + AVG(preferences_2.rating) > 4 THEN 'partial'
                    ELSE 'maybe'
                END as match
            FROM
                preferences
            LEFT JOIN
                preferences preferences_2 ON
                    preferences.movie_id = preferences_2.movie_id
                    AND preferences_2.user_id = :user_2
                    AND preferences.rating >= 2
            WHERE
                preferences.user_id = :user_1
                AND preferences.rating >= 2
                AND preferences_2.rating IS NOT NULL
            GROUP BY
                preferences.movie_id,
                preferences.user_id,
                preferences_2.user_id
            ORDER BY
                rating_combined DESC;
        '''
        params = {
            'user_1': self.user.id,
            'user_2': second_user_id
        }
        
        combined_preferences = self.db.execute(sql, params)
        
        # Format the response if needed
        formatted_preferences = []
        for pref in combined_preferences:
            movie_data = self.get_movie(pref["movie_id"])
            formatted_preferences.append({
                "movie_id": pref["movie_id"],
                "rating_combined": pref["rating_combined"],
                "match_status": pref["match"],
                "title": movie_data.get("title") if movie_data else None,
                "poster_path": movie_data.get("poster_path") if movie_data else None
            })
        
        return formatted_preferences
    

# dev/debug
if __name__ == '__main__':
    service = Service(None)
    service.populate_movies_cache()
    pass