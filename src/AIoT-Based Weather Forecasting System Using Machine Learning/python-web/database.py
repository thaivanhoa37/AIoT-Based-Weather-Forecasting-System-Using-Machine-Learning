"""
Database configuration and session management
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection parameters
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "1")
DB_NAME = os.getenv("DB_NAME", "weather_forecasting")

# Create database URL
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Enable connection health checks
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False           # Set to True for SQL query logging
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session.
    Use with FastAPI Depends().
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database (create tables if they don't exist).
    Note: Tables are already created via init-database.sql
    """
    # Import all models here to ensure they are registered
    from models import sensor_data, weather_forecasting  # noqa
    
    # Create tables (will skip if already exist)
    Base.metadata.create_all(bind=engine)
    print("✓ Database initialized successfully!")


if __name__ == "__main__":
    # Test database connection
    try:
        with engine.connect() as connection:
            print(f"✓ Successfully connected to database: {DB_NAME}")
            print(f"  Host: {DB_HOST}:{DB_PORT}")
            print(f"  User: {DB_USER}")
    except Exception as e:
        print(f"✗ Failed to connect to database: {e}")
