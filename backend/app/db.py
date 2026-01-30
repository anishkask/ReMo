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

# Convert postgres:// to postgresql+psycopg2:// (Render sometimes provides postgres://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    logger.info("Converted postgres:// to postgresql+psycopg2://")

# Configure engine with appropriate connect args
if "sqlite" in DATABASE_URL:
    # SQLite-specific configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False  # Set to True for SQL query logging
    )
    logger.info("Using SQLite database (local development)")
else:
    # Postgres configuration
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=5,
        max_overflow=10,
        echo=False
    )
    logger.info("Using Postgres database (production)")

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
        logger.error(f"Database connection check failed: {e}")
        return False
