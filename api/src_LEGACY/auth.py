"""
Authentication related functionality.
"""
from fastapi import FastAPI, Request, Response, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel
from typing import Optional, Dict
import jwt
from datetime import datetime, timedelta
import hashlib
import os
try:
    from .services import DB
    from .utils import api_response, COOKIE_SETTINGS, StatusCode, logger
    from .auth_middleware import OAuth2PasswordBearerWithCookie
except:
    from services import DB
    from utils import api_response, COOKIE_SETTINGS, StatusCode, logger
    from auth_middleware import OAuth2PasswordBearerWithCookie

# Define models for request/response
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    avatar: str
    email: Optional[str] = None

# JWT Config - Use environment variables for security
SECRET_KEY = os.getenv('JWT_SECRET_KEY', "YOUR_FALLBACK_SECRET_KEY")  # Use env var in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# OAuth2 scheme for token validation that works with cookies
oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="api/auth/login")

def get_password_hash(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return get_password_hash(plain_password) == hashed_password

def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT token.
    
    Args:
        data: Token data payload
        expires_delta: Optional token expiry time
        
    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    
    # Ensure 'sub' is a string
    if 'sub' in to_encode and not isinstance(to_encode['sub'], str):
        to_encode['sub'] = str(to_encode['sub'])
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    # Some JWT libraries return bytes, some return strings
    if isinstance(encoded_jwt, bytes):
        encoded_jwt = encoded_jwt.decode('utf-8')
        
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    """
    Validate JWT token and get current user.
    
    Args:
        token: JWT token from cookie
        
    Returns:
        User dictionary
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=StatusCode.UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    print(f"[DEBUG] get_current_user received token: type={type(token)}")
    print(f"[DEBUG] token value (first 10 chars): {token[:10] if token and isinstance(token, str) and len(token) > 10 else token}")
    
    try:
        # Make sure we're working with a string token
        if not isinstance(token, str):
            logger.error(f"Token is not a string: {type(token)}")
            print(f"[DEBUG] Token is not a string but {type(token)}: {token}")
            raise credentials_exception
        
        print(f"[DEBUG] About to decode token with SECRET_KEY: {SECRET_KEY[:3]}... (truncated)")
        
        try:
            # Try to decode the token
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            print(f"[DEBUG] Decoded JWT payload keys: {list(payload.keys())}")
        except Exception as jwt_error:
            # If it fails, let's try to inspect the token more closely
            print(f"[DEBUG] JWT decode failed: {str(jwt_error)}")
            
            # Try to see if it's a valid JWT format at least
            parts = token.split('.')
            print(f"[DEBUG] Token has {len(parts)} parts (should be 3 for valid JWT)")
            
            if len(parts) == 3:
                import base64
                try:
                    # Try to decode the header and payload parts
                    header_bytes = base64.urlsafe_b64decode(parts[0] + '=' * (4 - len(parts[0]) % 4))
                    header = header_bytes.decode('utf-8')
                    print(f"[DEBUG] Token header: {header}")
                except Exception as e:
                    print(f"[DEBUG] Failed to decode token header: {str(e)}")
            
            # Re-raise the original error
            raise jwt_error
            
        user_id_str = payload.get("sub")
        print(f"[DEBUG] Extracted sub claim: {user_id_str}, type: {type(user_id_str)}")
        
        if user_id_str is None:
            print("[DEBUG] No 'sub' claim found in token")
            raise credentials_exception
        
        # Convert to integer after extraction
        try:
            print(f"[DEBUG] Converting user_id_str to int: {user_id_str}")
            user_id = int(user_id_str)
            print(f"[DEBUG] Converted user_id: {user_id}")
        except ValueError:
            error_msg = f"Failed to convert user_id to int: {user_id_str}"
            logger.error(error_msg)
            print(f"[DEBUG] {error_msg}")
            raise credentials_exception
    except jwt.PyJWTError as e:
        error_msg = f"JWT decode error: {str(e)}"
        logger.error(error_msg)
        print(f"[DEBUG] {error_msg}")
        raise credentials_exception
    except Exception as e:
        error_msg = f"Unexpected error in token validation: {str(e)}"
        logger.error(error_msg)
        print(f"[DEBUG] {error_msg}")
        raise credentials_exception
    
    print(f"[DEBUG] Looking up user with ID: {user_id}")
    db = DB()
    user = db.get_user_by_id(user_id)
    
    if user is None:
        print(f"[DEBUG] No user found with ID: {user_id}")
        raise credentials_exception
        
    print(f"[DEBUG] Successfully found user: {user.get('name')}")
    return user

def set_auth_cookie(response: JSONResponse, token: str) -> None:
    """
    Set authentication cookie with consistent settings.
    
    Args:
        response: JSONResponse object
        token: JWT token
    """
    print(f"[DEBUG] set_auth_cookie received token type: {type(token)}")
    print(f"[DEBUG] token first 15 chars: {token[:15]}...")
    
    # Check if the token already has a "Bearer " prefix
    if token.startswith("Bearer "):
        print("[DEBUG] WARNING: Token already has Bearer prefix")
    
    cookie_value = f"Bearer {token}"
    print(f"[DEBUG] Setting cookie value: {cookie_value[:20]}...")
    
    # Verify the cookie value format
    scheme, extracted_token = get_authorization_scheme_param(cookie_value)
    if scheme and extracted_token:
        print(f"[DEBUG] Cookie format verification - scheme: {scheme}, token: {extracted_token[:10]}...")
    
    response.set_cookie(
        key="access_token",
        value=cookie_value,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **COOKIE_SETTINGS
    )
    
    print(f"[DEBUG] Cookie set with max_age: {ACCESS_TOKEN_EXPIRE_MINUTES * 60} seconds")
    print(f"[DEBUG] Cookie settings: {COOKIE_SETTINGS}")

def register_auth_routes(app: FastAPI) -> None:
    """
    Register all authentication related routes.
    
    Args:
        app: FastAPI application instance
    """
    @app.get("/api/auth/me", response_model=UserResponse)
    async def get_me(current_user: Dict = Depends(get_current_user)):
        """Get current authenticated user."""
        print(f"[DEBUG] /api/auth/me endpoint called, found user: {current_user.get('name')}")
        return {
            "id": current_user["id"],
            "name": current_user["name"],
            "avatar": current_user.get("avatar", current_user["name"][0].upper()),
            "email": current_user["email"]
        }

    @app.post("/api/auth/login")
    async def login(form_data: OAuth2PasswordRequestForm = Depends()):
        """Login endpoint."""
        print(f"[DEBUG] Login attempt for email: {form_data.username}")
        
        db = DB()
        user = db.get_user_by_email(form_data.username)  # Username is actually email

        if not user or not verify_password(form_data.password, user.get("password")):
            logger.warning(f"Failed login attempt for email: {form_data.username}")
            print(f"[DEBUG] Login failed - incorrect email or password")
            return api_response(
                status="error",
                message="Incorrect email or password",
                status_code=StatusCode.UNAUTHORIZED
            )
        
        print(f"[DEBUG] Login successful for user: {user.get('name')}")
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["id"])}, expires_delta=access_token_expires
        )
        
        # User data for response
        user_data = {
            "id": user["id"],
            "name": user["name"],
            "avatar": user.get("avatar", user["name"][0].upper()),
            "email": user["email"]
        }
        
        print(f"[DEBUG] Created user data response: {user_data}")
        
        # Create response with user data
        response = api_response(data=user_data)
        
        # Set authentication cookie
        set_auth_cookie(response, access_token)
        
        return response

    @app.post("/api/auth/register", response_model=UserResponse)
    async def register(user_data: UserCreate):
        """Register new user endpoint."""
        print(f"[DEBUG] Registration attempt for email: {user_data.email}")
        
        db = DB()
        
        # Check if user already exists
        existing_user = db.get_user_by_email(user_data.email)
        if existing_user:
            print(f"[DEBUG] Registration failed - email already exists: {user_data.email}")
            return api_response(
                status="error",
                message="Email already registered",
                status_code=StatusCode.CONFLICT
            )
        
        # Hash the password
        hashed_password = get_password_hash(user_data.password)
        print(f"[DEBUG] Password hashed successfully")
        
        # Create the user
        new_user = {
            "name": user_data.name,
            "email": user_data.email,
            "password": hashed_password,
            "avatar": user_data.name[0].upper()  # Default avatar is first letter of name
        }
        
        # Save user to database
        user_id = db.create_user(new_user)
        print(f"[DEBUG] User created with ID: {user_id}")
        
        if not user_id:
            print(f"[DEBUG] Failed to create user in database")
            return api_response(
                status="error",
                message="Failed to create user",
                status_code=StatusCode.INTERNAL_SERVER_ERROR
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user_id)}, expires_delta=access_token_expires
        )
        
        # User data for response
        user_response = {
            "id": user_id,
            "name": user_data.name,
            "avatar": new_user["avatar"],
            "email": user_data.email
        }
        
        print(f"[DEBUG] Created user response: {user_response}")
        
        # Create response with user data
        response = api_response(data=user_response, status_code=StatusCode.CREATED)
        
        # Set authentication cookie
        set_auth_cookie(response, access_token)
        
        return response
    
    @app.post("/api/auth/logout")
    async def logout():
        """Logout endpoint - removes auth cookie."""
        print(f"[DEBUG] Logout endpoint called")
        response = api_response(message="Successfully logged out")
        response.delete_cookie(key="access_token")
        print(f"[DEBUG] access_token cookie deleted")
        return response