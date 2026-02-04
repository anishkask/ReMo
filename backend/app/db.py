"""
Database configuration and session management for ReMo
Supports both SQLite (local dev) and Postgres (production)
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging

logger = logging.getLogger(__name__)

# Get DATABASE_URL from environment, default to SQLite for local dev
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./remo.db")

# Log database configuration at startup
if DATABASE_URL:
    logger.info(f"[DB] DATABASE_URL is set: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
else:
    logger.warning("[DB] DATABASE_URL is not set, using default SQLite")

# Convert postgres:// to postgresql+psycopg2:// (Render sometimes provides postgres://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    logger.info("[DB] Converted postgres:// to postgresql+psycopg2://")

# Determine database type
if "sqlite" in DATABASE_URL:
    DB_SCHEME = "sqlite"
    # SQLite-specific configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False  # Set to True for SQL query logging
    )
    logger.info("[DB] Using SQLite database (local development)")
else:
    DB_SCHEME = "postgresql"
    # Postgres configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,
        max_overflow=10,
        echo=False
    )
    logger.info("[DB] Using Postgres database (production)")

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function for FastAPI to get database session.
    Yields a session and ensures it's closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Check if database connection is healthy"""
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        logger.error(f"[DB] Database connection check failed: {e}")
        return False


def get_db_info():
    """Get database information for debug endpoint"""
    from sqlalchemy import inspect
    
    info = {
        "db_url_scheme": DB_SCHEME,
        "db_host": "unknown",
        "tables_present": [],
        "comment_count": 0
    }
    
    try:
        # Extract host from DATABASE_URL (redact password)
        if "@" in DATABASE_URL:
            parts = DATABASE_URL.split("@")
            if len(parts) > 1:
                host_part = parts[1].split("/")[0]
                info["db_host"] = host_part.split("?")[0]  # Remove query params
        
        # Check which tables exist
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        info["tables_present"] = existing_tables
        
        # Count comments if comments table exists
        if "comments" in existing_tables:
            from app.models import Comment
            from sqlalchemy.orm import Session
            db = SessionLocal()
            try:
                info["comment_count"] = db.query(Comment).count()
            finally:
                db.close()
    except Exception as e:
        logger.error(f"[DB] Error getting DB info: {e}")
        info["error"] = str(e)
    
    return info
