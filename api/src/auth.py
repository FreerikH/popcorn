from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

try:
    from .database import DB
except:
    from database import DB

# Security configurations
SECRET_KEY = "your-secret-key"  # In production, use a secure secret key and store in env variables
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing - using sha256_crypt instead of bcrypt
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database instance
db = DB()

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

# Helper functions
def verify_password(plain_password, hashed_password):
    #return True
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(email: str):
    # Query the database for the user with the given email
    users = db.execute("SELECT id, name, email, password as hashed_password, avatar FROM users WHERE email = :email", {"email": email})
    if users and len(users) > 0:
        user_dict = users[0]
        # Add disabled field if it doesn't exist in your table
        if "disabled" not in user_dict:
            user_dict["disabled"] = False
        return UserInDB(**user_dict)
    return None

def authenticate_user(email: str, password: str):
    user = get_user(email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    user = get_user(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Additional functions for user management
def create_user(name: str, email: str, password: str, avatar: Optional[str] = None):
    hashed_password = get_password_hash(password)
    
    # Check if user already exists
    existing_user = get_user(email)
    if existing_user:
        return None
    
    # Insert new user into database
    db.execute(
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
    return get_user(email)

def update_user(user_id: int, data: dict):
    # Build update query dynamically based on provided data
    update_fields = []
    params = {"id": user_id}
    
    for key, value in data.items():
        if key in ["name", "email", "avatar"]:
            update_fields.append(f"{key} = :{key}")
            params[key] = value
        elif key == "password":
            update_fields.append("password = :password")
            params["password"] = get_password_hash(value)
    
    if not update_fields:
        return None
    
    query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = :id"
    db.execute(query, params, fetch=False)
    
    # Get and return updated user
    users = db.execute("SELECT * FROM users WHERE id = :id", {"id": user_id})
    if users and len(users) > 0:
        user_dict = users[0]
        if "disabled" not in user_dict:
            user_dict["disabled"] = False
        return UserInDB(**user_dict)
    return None