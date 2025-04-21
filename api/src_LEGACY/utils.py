"""
Utility functions for consistent error handling, response formatting, and data conversion.
"""
from fastapi.responses import JSONResponse
from typing import Any, Dict, List, Optional, Tuple, Union
from functools import wraps
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def api_response(
    data: Any = None,
    status: str = "success",
    message: Optional[str] = None,
    status_code: int = 200
) -> JSONResponse:
    """
    Create a standardized API response format.
    
    Args:
        data: The response data
        status: Response status ("success" or "error")
        message: Optional message to include
        status_code: HTTP status code
        
    Returns:
        JSONResponse with standardized format
    """
    response = {
        "status": status,
    }
    
    if data is not None:
        response["data"] = data
        
    if message:
        response["message"] = message
        
    return JSONResponse(
        status_code=status_code,
        content=response
    )

def row_to_dict(row: Any, keys: Optional[List[str]] = None) -> Dict:
    """
    Consistently convert a database row to a dictionary.
    
    Args:
        row: Database row result
        keys: Optional column names if row is a tuple
        
    Returns:
        Dictionary representation of the row
    """
    if row is None:
        return {}
        
    if hasattr(row, '_mapping'):  # SQLAlchemy 2.0
        return dict(row._mapping)
    elif hasattr(row, 'keys'):  # SQLAlchemy 1.x
        return dict(row)
    else:  # Tuple
        if keys:
            return {k: v for k, v in zip(keys, row)}
        return dict(enumerate(row))  # Fallback with numeric keys

def handle_db_operation(operation_name: str):
    """
    Decorator for handling database operations consistently.
    
    Args:
        operation_name: Name of the operation for logging
    
    Returns:
        Decorated function
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {operation_name}: {str(e)}")
                logger.error(traceback.format_exc())
                return None
        return wrapper
    return decorator

# Constants for security
COOKIE_SETTINGS = {
    "httponly": True,
    "samesite": 'none', #"lax",
    "secure": True, #False, #True,  # Set to False in development without HTTPS
    #"partitioned": True, # not yet implented in fastapi?
}

# HTTP status codes as named constants
class StatusCode:
    OK = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    INTERNAL_SERVER_ERROR = 500