#services_LEGACY.py
"""
Services for API and database operations.
"""
from dotenv import load_dotenv
import os
import requests
import random
from sqlalchemy import create_engine, text
from typing import Dict, Optional, List, Any
try:
    from .utils import handle_db_operation, row_to_dict, logger
except:
    from utils import handle_db_operation, row_to_dict, logger

load_dotenv()

class API:
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
                    logger.error(f"Failed with random movie ID {movie_id}: {response_json}")
                    attempts += 1
                    
                    if attempts < max_attempts:
                        logger.info(f"Retrying with new random ID (attempt {attempts+1}/{max_attempts})")
                        time.sleep(1)  # Wait 1 second before next attempt
                    
                except Exception as e:
                    logger.error(f"Error fetching movie with ID {movie_id}: {str(e)}")
                    attempts += 1
                    
                    if attempts < max_attempts:
                        logger.info(f"Retrying with new random ID (attempt {attempts+1}/{max_attempts})")
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
                    logger.error(f"API error: {response_json}")
                    return {"status": "error", "message": "Failed to fetch movie data"}
                    
                # Resolve poster path URL
                if response_json.get('poster_path'):
                    response_json['poster_path'] = self.image_url + response_json['poster_path']
                
                return response_json
                
            except Exception as e:
                logger.error(f"Error fetching movie: {str(e)}")
                return {"status": "error", "message": "Failed to fetch movie data"}


class DB:
    """Database operations class."""
    
    def __init__(self):
        self.engine = create_engine(os.getenv('DB_CONNECTION_STRING'))
    
    @handle_db_operation("update_preference")
    def update_preference(self, data: Dict) -> bool:
        """
        Update user movie preferences.
        
        Args:
            data: Dictionary with user_id, movie_id, and rating
            
        Returns:
            Success status
        """
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
        '''
        with self.engine.connect() as connection:
            connection.execute(text(sql), data)
            connection.commit()
        return True
            
    @handle_db_operation("get_users")
    def get_users(self) -> List[Dict]:
        """
        Get all users.
        
        Returns:
            List of user dictionaries
        """
        sql = "SELECT id, name, email, password, avatar FROM users"
        with self.engine.connect() as connection:
            result = connection.execute(text(sql))
            users = [row_to_dict(row) for row in result]
            return users
   
    @handle_db_operation("get_user_by_id")
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """
        Get a user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            User dictionary or None if not found
        """
        sql = "SELECT id, name, email, password, avatar FROM users WHERE id = :user_id"
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), {"user_id": user_id})
            user = result.fetchone()
            return row_to_dict(user) if user else None
   
    @handle_db_operation("get_user_by_email")
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """
        Get a user by email.
        
        Args:
            email: User email
            
        Returns:
            User dictionary or None if not found
        """
        sql = "SELECT id, name, email, password, avatar FROM users WHERE email = :email"
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), {"email": email})
            user = result.fetchone()
            return row_to_dict(user) if user else None
   
    @handle_db_operation("create_user")
    def create_user(self, user_data: Dict) -> Optional[int]:
        """
        Create a new user.
        
        Args:
            user_data: User data dictionary
            
        Returns:
            New user ID or None on failure
        """
        sql = '''
            INSERT INTO users (
                name,
                email, 
                password,
                avatar
            ) VALUES (
                :name,
                :email,
                :password,
                :avatar
            ) RETURNING id
        '''
        # Generate avatar if not provided (first letter of name)
        if 'avatar' not in user_data:
            user_data['avatar'] = user_data['name'][0].upper()
                
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), user_data)
            connection.commit()
            user_id = result.fetchone()[0]
            return user_id
   
    @handle_db_operation("update_user")
    def update_user(self, user_id: int, user_data: Dict) -> bool:
        """
        Update a user by ID.
        
        Args:
            user_id: User ID
            user_data: User data to update
            
        Returns:
            Success status
        """
        # Create SQL based on provided fields to update
        set_clauses = []
        params = {"user_id": user_id}
        
        # Check which fields are being updated
        for field in ["name", "email", "password", "avatar"]:
            if field in user_data:
                set_clauses.append(f"{field} = :{field}")
                params[field] = user_data[field]
        
        if not set_clauses:
            return False  # No fields to update
            
        sql = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = :user_id"
        
        with self.engine.connect() as connection:
            connection.execute(text(sql), params)
            connection.commit()
            return True
   
    @handle_db_operation("delete_user")
    def delete_user(self, user_id: int) -> bool:
        """
        Delete a user by ID.
        
        Args:
            user_id: User ID
            
        Returns:
            Success status
        """
        sql = "DELETE FROM users WHERE id = :user_id"
        with self.engine.connect() as connection:
            connection.execute(text(sql), {"user_id": user_id})
            connection.commit()
            return True
        
    @handle_db_operation("search_users")
    def search_users(self, query: str) -> List[Dict]:
        """
        Search users by name or email.
        
        Args:
            query: Search query string
            
        Returns:
            List of matching user dictionaries
        """
        sql = "SELECT id, name, email FROM users WHERE name ILIKE :query OR email ILIKE :query LIMIT 10"
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), {"query": f"%{query}%"})
            users = [row_to_dict(row) for row in result]
            return users
        
    @handle_db_operation("add_friend_request")
    def add_friend_request(self, user_id: int, friend_id: int) -> bool:
        """
        Send a friend request from user_id to friend_id.
        
        Args:
            user_id: Sender user ID
            friend_id: Receiver user ID
            
        Returns:
            Success status
        """
        # First check if a request already exists or if they're already friends
        check_sql = """
            SELECT * FROM friend_requests 
            WHERE (sender_id = :user_id AND receiver_id = :friend_id)
            OR (sender_id = :friend_id AND receiver_id = :user_id)
        """
        
        check_friends_sql = """
            SELECT * FROM friends 
            WHERE (user_id1 = :user_id AND user_id2 = :friend_id)
            OR (user_id1 = :friend_id AND user_id2 = :user_id)
        """
        
        insert_sql = """
            INSERT INTO friend_requests (sender_id, receiver_id, status)
            VALUES (:user_id, :friend_id, 'pending')
        """
        
        with self.engine.connect() as connection:
            # Check for existing request
            params = {"user_id": user_id, "friend_id": friend_id}
            request_result = connection.execute(text(check_sql), params)
            existing_request = request_result.fetchone()
            
            # Check if already friends
            friends_result = connection.execute(text(check_friends_sql), params)
            existing_friendship = friends_result.fetchone()
            
            if existing_request or existing_friendship:
                return False  # Request already exists or already friends
            
            # Insert new request
            connection.execute(text(insert_sql), params)
            connection.commit()
            return True

    @handle_db_operation("get_friend_requests")
    def get_friend_requests(self, user_id: int) -> List[Dict]:
        """
        Get pending friend requests for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of friend request dictionaries
        """
        sql = """
            SELECT fr.id, fr.sender_id, fr.created_at, u.name as sender_name
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.id
            WHERE fr.receiver_id = :user_id AND fr.status = 'pending'
        """
        
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), {"user_id": user_id})
            requests = [row_to_dict(row) for row in result]
            return requests

    @handle_db_operation("accept_friend_request")
    def accept_friend_request(self, request_id: int, user_id: int) -> bool:
        """
        Accept a friend request and create a friendship.
        
        Args:
            request_id: Friend request ID
            user_id: User ID of request recipient
            
        Returns:
            Success status
        """
        # Update request status
        update_sql = """
            UPDATE friend_requests
            SET status = 'accepted'
            WHERE id = :request_id AND receiver_id = :user_id
            RETURNING sender_id
        """
        
        # Create friendship
        insert_sql = """
            INSERT INTO friends (user_id1, user_id2)
            VALUES (:user_id1, :user_id2)
        """
        
        with self.engine.connect() as connection:
            # Update request status
            result = connection.execute(
                text(update_sql), 
                {"request_id": request_id, "user_id": user_id}
            )
            sender = result.fetchone()
            
            if not sender:
                return False  # Request not found or user not receiver
            
            sender_id = sender[0]
            
            # Create friendship record
            connection.execute(
                text(insert_sql),
                {"user_id1": min(user_id, sender_id), "user_id2": max(user_id, sender_id)}
            )
            
            connection.commit()
            return True

    @handle_db_operation("get_friends")
    def get_friends(self, user_id: int) -> List[Dict]:
        """
        Get all friends for a user.
        
        Args:
            user_id: User ID
            
        Returns:
            List of friend dictionaries
        """
        sql = """
            SELECT 
                u.id, u.name, u.avatar,
                CASE 
                    WHEN f.user_id1 = :user_id THEN f.user_id2
                    ELSE f.user_id1
                END as friend_id
            FROM friends f
            JOIN users u ON (
                CASE 
                    WHEN f.user_id1 = :user_id THEN f.user_id2
                    ELSE f.user_id1
                END = u.id
            )
            WHERE f.user_id1 = :user_id OR f.user_id2 = :user_id
        """
        
        with self.engine.connect() as connection:
            result = connection.execute(text(sql), {"user_id": user_id})
            friends = [row_to_dict(row) for row in result]
            return friends