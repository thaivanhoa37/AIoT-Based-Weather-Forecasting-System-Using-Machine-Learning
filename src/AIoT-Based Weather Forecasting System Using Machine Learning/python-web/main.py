"""
FastAPI Weather Forecasting Application
Main application entry point
"""
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

# Get base directory
BASE_DIR = Path(__file__).resolve().parent

# Load environment variables
load_dotenv()

# Import database and routes
from database import init_db
from routes import pages_router, api_router

# Create FastAPI app
app = FastAPI(
    title="AIoT Weather Forecasting System",
    description="IoT-based Weather Forecasting System using Machine Learning",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
origins = os.getenv("CORS_ORIGINS", "http://localhost:8000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files with absolute path
static_dir = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Include routers
app.include_router(pages_router)  # Page routes (HTML rendering)
app.include_router(api_router)     # API routes (REST endpoints)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("\n" + "="*50)
    print("🚀 Starting AIoT Weather Forecasting System")
    print("="*50)
    try:
        init_db()
        print("✓ Database initialized")
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
    
    # Start Auto-Training Scheduler
    try:
        from auto_train_scheduler import start_scheduler
        start_scheduler()
        print("✓ Auto-Training Scheduler started")
    except Exception as e:
        print(f"⚠ Auto-Training Scheduler failed to start: {e}")
    
    print("="*50 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("\n" + "="*50)
    print("🛑 Shutting down AIoT Weather Forecasting System")
    try:
        from auto_train_scheduler import stop_scheduler
        stop_scheduler()
        print("✓ Auto-Training Scheduler stopped")
    except Exception as e:
        print(f"⚠ Error stopping scheduler: {e}")
    print("="*50 + "\n")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "AIoT Weather Forecasting System",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("APP_HOST", "0.0.0.0")
    port = int(os.getenv("APP_PORT", 8000))
    debug = os.getenv("APP_DEBUG", "True").lower() == "true"
    
    print(f"\n🌤️  Starting server at http://{host}:{port}")
    print(f"📚 API Documentation: http://{host}:{port}/docs\n")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )
