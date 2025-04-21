"""
Main application entry point.
"""
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
try:
    from .services import API, DB
    from .auth import register_auth_routes, get_current_user
    from .utils import api_response, StatusCode, logger
except:
    from services import API, DB
    from auth import register_auth_routes, get_current_user
    from utils import api_response, StatusCode, logger


# Initialize FastAPI app
app = FastAPI(title="Social Movie App API")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
@app.get('/api')
def read_root():
    """API health check endpoint."""
    return api_response(data={"message": "API is running"})

# Protected API routes - adding Depends(get_current_user)
@app.get('/api/movie', dependencies=[Depends(get_current_user)])
def get_movie():
    """Get a random movie."""
    api = API()
    result = api.get_movie()
    
    if result["status"] == "error":
        return api_response(
            status="error",
            message=result["message"],
            status_code=StatusCode.INTERNAL_SERVER_ERROR
        )
    
    return api_response(data=result["data"])

@app.post('/api/movie', dependencies=[Depends(get_current_user)])
async def post_movie(request: Request):
    """Update movie preference."""
    try:
        data = await request.json()
        db = DB()
        success = db.update_preference(data)
        
        if not success:
            return api_response(
                status="error",
                message="Failed to update preference",
                status_code=StatusCode.INTERNAL_SERVER_ERROR
            )
            
        return api_response(message="Preference updated successfully")
    except Exception as e:
        logger.error(f"Error updating preference: {str(e)}")
        return api_response(
            status="error",
            message=f"Invalid request: {str(e)}",
            status_code=StatusCode.BAD_REQUEST
        )

@app.get("/api/users/search", dependencies=[Depends(get_current_user)])
def search_users(query: str):
    """Search users by name or email."""
    db = DB()
    users = db.search_users(query)
    return api_response(data={"results": users})

# This route already has the dependency, so no change needed
@app.get('/api/profile')
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile. Protected route."""
    return api_response(data={
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "avatar": current_user.get("avatar", current_user["name"][0].upper())
    })

@app.post('/api/friends/request', dependencies=[Depends(get_current_user)])
async def send_friend_request(request: Request, current_user: dict = Depends(get_current_user)):
    """Send a friend request to another user."""
    try:
        data = await request.json()
        friend_id = data.get('userId')
        
        if not friend_id:
            return api_response(
                status="error",
                message="Missing friend ID",
                status_code=StatusCode.BAD_REQUEST
            )
        
        db = DB()
        result = db.add_friend_request(current_user["id"], friend_id)
        
        if result:
            return api_response(message="Friend request sent")
        else:
            return api_response(
                status="error",
                message="Failed to send friend request. It might already exist.",
                status_code=StatusCode.CONFLICT
            )
    except Exception as e:
        logger.error(f"Error sending friend request: {str(e)}")
        return api_response(
            status="error",
            message=f"Invalid request: {str(e)}",
            status_code=StatusCode.BAD_REQUEST
        )

@app.get('/api/friends', dependencies=[Depends(get_current_user)])
async def get_friends(current_user: dict = Depends(get_current_user)):
    """Get all friends for the current user."""
    db = DB()
    friends = db.get_friends(current_user["id"])
    return api_response(data={"friends": friends})

@app.get('/api/friends/requests', dependencies=[Depends(get_current_user)])
async def get_friend_requests(current_user: dict = Depends(get_current_user)):
    """Get all pending friend requests for the current user."""
    db = DB()
    requests = db.get_friend_requests(current_user["id"])
    return api_response(data={"requests": requests})

@app.post('/api/friends/accept', dependencies=[Depends(get_current_user)])
async def accept_friend_request(request: Request, current_user: dict = Depends(get_current_user)):
    """Accept a friend request."""
    try:
        data = await request.json()
        request_id = data.get('requestId')
        
        if not request_id:
            return api_response(
                status="error",
                message="Missing request ID",
                status_code=StatusCode.BAD_REQUEST
            )
        
        db = DB()
        result = db.accept_friend_request(request_id, current_user["id"])
        
        if result:
            return api_response(message="Friend request accepted")
        else:
            return api_response(
                status="error",
                message="Failed to accept friend request. It might not exist or you may not be the recipient.",
                status_code=StatusCode.BAD_REQUEST
            )
    except Exception as e:
        logger.error(f"Error accepting friend request: {str(e)}")
        return api_response(
            status="error",
            message=f"Invalid request: {str(e)}",
            status_code=StatusCode.BAD_REQUEST
        )

# Register authentication routes (login and registration will be unprotected)
register_auth_routes(app)

# Get absolute paths to React app files
react_app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'dist'))
react_app_index = os.path.join(react_app_dir, 'index.html')

# Mount assets directory at /assets path (matching what the React app expects)
try:
    assets_dir = os.path.join(react_app_dir, 'assets')
    if os.path.exists(assets_dir):
        app.mount('/assets', StaticFiles(directory=assets_dir), name='assets')
    else:
        logger.warning(f"Assets directory not found at {assets_dir}")
except Exception as e:
    logger.error(f"Error mounting static files: {str(e)}")

# Serve the React app - catch-all route for the frontend
@app.get('/{full_path:path}')
async def serve_react(full_path: str):
    """Serve the React SPA for all non-API routes."""
    # If the path starts with 'api', return a 404 - it should be caught by API routes
    if full_path.startswith('api/'):
        return api_response(
            status="error", 
            message="Not Found", 
            status_code=StatusCode.NOT_FOUND
        )
    
    # Return the React app's index.html for all other routes
    if os.path.exists(react_app_index):
        return FileResponse(react_app_index)
    else:
        logger.error(f"React app index not found at {react_app_index}")
        return api_response(
            status="error",
            message="Frontend not available",
            status_code=StatusCode.INTERNAL_SERVER_ERROR
        )

# Development server
if __name__ == '__main__':
    uvicorn.run('main:app', host="0.0.0.0", port=8000, reload=True)