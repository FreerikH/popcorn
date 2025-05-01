from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.exceptions import HTTPException
import os
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime
import logging

try:
    from .routes import router
    from .service import Service
except:
    from routes import router
    from service import Service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="FastAPI Auth Example")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create scheduler
scheduler = AsyncIOScheduler()

# Define your background task
async def scheduled_task():
    logger.info(f"Scheduled task running at: {datetime.now()}")
    service = Service(None)
    service.populate_movies_cache()

# Add startup and shutdown events
@app.on_event("startup")
async def startup_event():
    # Schedule your task (this example runs every minute)
    scheduler.add_job(scheduled_task, 'interval', minutes=5)
    # You can also use cron-style scheduling:
    # scheduler.add_job(scheduled_task, 'cron', hour=0)  # Run at midnight every day
    scheduler.start()
    logger.info("Background scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    logger.info("Background scheduler shut down")

# Include the router with /api prefix
app.include_router(router)

# Get absolute paths to React app files
react_app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'dist'))
react_app_index = os.path.join(react_app_dir, 'index.html')

# Mount static assets directory
assets_dir = os.path.join(react_app_dir, 'assets')
app.mount('/assets', StaticFiles(directory=assets_dir), name='assets')

# Serve the React app - catch-all route for the frontend
# This should be placed after all API routes to avoid conflicts
@app.get('/{full_path:path}')
async def serve_react(full_path: str):
    # Skip API routes - they're handled by the router
    if full_path.startswith('api/'):
        raise HTTPException(status_code=404, detail="Not found")
    if full_path == '':
        full_path = 'index.html'
    if not '.' in full_path or full_path == 'favicon.ico':
        full_path = 'index.html'
    try:
        return FileResponse(os.path.join(react_app_dir, full_path))
    except:
        return ''

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7000, reload=False)