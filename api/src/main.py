from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
import os
from services import API, DB

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# API routes
@app.get('/api')
def read_root():
    return {'Hello': 'World'}

@app.get('/api/movie')
def get_movie():
    api = API()
    return api.get_movie()

@app.post('/api/movie')
async def post_movie(request: Request):
    data = await request.json()
    db = DB()
    db.update_preference(data)
    return {'status': 'success'}

# Get absolute paths to React app files
react_app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'dist'))
react_app_index = os.path.join(react_app_dir, 'index.html')

# Mount assets directory at /assets path (matching what the React app expects)
app.mount('/assets', StaticFiles(directory=os.path.join(react_app_dir, 'assets')), name='assets')

# Serve the React app - catch-all route for the frontend
@app.get('/{full_path:path}')
async def serve_react(full_path: str):
    # If the path starts with 'api', return a 404 - it should be caught by API routes
    if full_path.startswith('api/'):
        return {'detail': 'Not Found'}
    
    # Return the React app's index.html for all other routes
    return FileResponse(react_app_index)

# Development server
if __name__ == '__main__':
    uvicorn.run('main:app', host="0.0.0.0", port=8000, reload=True)