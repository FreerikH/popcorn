from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import os

try:
    from .database import DB
except:
    from database import DB

# Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class User(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str] = None
    disabled: Optional[bool] = None

class UserInDB(User):
    hashed_password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    avatar: Optional[str] = None

# AuthConfig and AuthService classes
class AuthConfig:
    # Security configurations
    SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-please-change")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30 # 1 month
    
    # Password hashing configuration
    PWD_CONTEXT = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
    
    # OAuth2 configuration
    OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="token")

class AuthService:
    def __init__(self):
        self.db = DB()
        self.config = AuthConfig()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify if the plain password matches the hashed password"""
        return self.config.PWD_CONTEXT.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password for storage"""
        return self.config.PWD_CONTEXT.hash(password)
    
    def get_user(self, email: str) -> Optional[UserInDB]:
        """Get a user by email from the database"""
        users = self.db.execute(
            "SELECT id, name, email, password as hashed_password, avatar FROM users WHERE LOWER(email) = LOWER(:email)", 
            {"email": email}
        )
        if users and len(users) > 0:
            user_dict = users[0]
            # Add disabled field if it doesn't exist in your table
            if "disabled" not in user_dict:
                user_dict["disabled"] = False
            return UserInDB(**user_dict)
        return None
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate a user with email and password"""
        user = self.get_user(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.config.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, 
            self.config.SECRET_KEY, 
            algorithm=self.config.ALGORITHM
        )
        return encoded_jwt
    
    def create_user(self, name: str, email: str, password: str, avatar: Optional[str] = None) -> Optional[User]:
        """Create a new user in the database"""
        hashed_password = self.get_password_hash(password)
        
        # Check if user already exists
        existing_user = self.get_user(email)
        if existing_user:
            return None
        
        # Insert new user into database
        self.db.execute(
            """
            INSERT INTO users (name, email, password, avatar)
            VALUES (:name, :email, :password, :avatar)
            """,
            {
                "name": name,
                "email": email,
                "password": hashed_password,
                "avatar": avatar
            },
            fetch=False
        )
        
        # Return the created user
        return self.get_user(email)
    
    def update_user(self, user_id: int, data: Dict[str, Any]) -> Optional[User]:
        """Update a user's information"""
        # Build update query dynamically based on provided data
        update_fields = []
        params = {"id": user_id}
        
        for key, value in data.items():
            if key in ["name", "email", "avatar"]:
                update_fields.append(f"{key} = :{key}")
                params[key] = value
            elif key == "password":
                update_fields.append("password = :password")
                params["password"] = self.get_password_hash(value)
        
        if not update_fields:
            return None
        
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = :id"
        self.db.execute(query, params, fetch=False)
        
        # Get and return updated user
        users = self.db.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})
        if users and len(users) > 0:
            user_dict = users[0]
            if "disabled" not in user_dict:
                user_dict["disabled"] = False
            user_dict["hashed_password"] = user_dict.pop("password", "")
            return UserInDB(**user_dict)
        return None
        
    def search_users(self, query: str, current_user_id: int) -> List[Dict[str, Any]]:
        """Search users by name or email"""
        # Add wildcards for ILIKE query (case insensitive)
        query = f"%{query}%"
        
        # Search in both name and email fields
        sql = "SELECT id, name, email FROM users WHERE (email ILIKE :q OR name ILIKE :q)"
        params = {"q": query}
        
        # Execute the query and return results
        return self.db.execute(sql, params)
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and generate access token"""
        user = self.authenticate_user(email, password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = self.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

# Create a global instance of the auth service
auth_service = AuthService()

# FastAPI dependency to get the token
def get_token(token: str = Depends(AuthConfig.OAUTH2_SCHEME)) -> str:
    return token

# FastAPI dependency to get the current user
async def get_current_user(token: str = Depends(get_token)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, 
            AuthConfig.SECRET_KEY, 
            algorithms=[AuthConfig.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = auth_service.get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# FastAPI dependency to get the current active user
async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Export the needed functions and classes
__all__ = [
    'Token', 'User', 'UserInDB', 'TokenData', 'UserCreate',
    'auth_service',
    'get_current_user', 'get_current_active_user',
    'AuthConfig'
]