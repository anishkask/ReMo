"""
Database utilities for ReMo SQLite persistence
"""
import os
import sqlite3
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Database path from environment or default
DATABASE_URL = os.getenv("DATABASE_URL", "./remo.db")


def get_conn() -> sqlite3.Connection:
    """Get SQLite database connection"""
    conn = sqlite3.connect(DATABASE_URL)
    conn.row_factory = sqlite3.Row  # Enable column access by name
    return conn


def init_db():
    """Initialize database with tables if they don't exist"""
    conn = get_conn()
    cursor = conn.cursor()
    
    try:
        # Create videos table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS videos (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                url TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        
        # Create moments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS moments (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                timestamp_seconds INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (video_id) REFERENCES videos(id)
            )
        """)
        
        # Create comments table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id TEXT PRIMARY KEY,
                video_id TEXT NOT NULL,
                moment_id TEXT,
                timestamp_seconds INTEGER NOT NULL,
                user_id TEXT,
                display_name TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (video_id) REFERENCES videos(id),
                FOREIGN KEY (moment_id) REFERENCES moments(id)
            )
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_comments_video_timestamp 
            ON comments(video_id, timestamp_seconds)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_comments_moment 
            ON comments(moment_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_moments_video_timestamp 
            ON moments(video_id, timestamp_seconds)
        """)
        
        conn.commit()
        logger.info("Database initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def seed_demo_data():
    """Seed database with demo data if empty"""
    conn = get_conn()
    cursor = conn.cursor()
    
    try:
        # Check if videos table is empty
        cursor.execute("SELECT COUNT(*) as count FROM videos")
        video_count = cursor.fetchone()["count"]
        
        if video_count == 0:
            logger.info("Seeding demo data...")
            now = datetime.utcnow().isoformat()
            
            # Insert demo videos
            demo_videos = [
                ("1", "Big Buck Bunny", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", now),
                ("2", "Elephant's Dream", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4", now),
                ("3", "For Bigger Blazes", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", now),
            ]
            
            cursor.executemany(
                "INSERT INTO videos (id, title, url, created_at) VALUES (?, ?, ?, ?)",
                demo_videos
            )
            
            # Insert demo moments (convert timestamps to seconds)
            # "00:02:15" = 135 seconds, "00:05:30" = 330 seconds, "00:08:45" = 525 seconds
            demo_moments = [
                ("moment-1-00-02-15", "1", 135, now),
                ("moment-1-00-05-30", "1", 330, now),
                ("moment-1-00-08-45", "1", 525, now),
                ("moment-2-00-02-15", "2", 135, now),
                ("moment-2-00-05-30", "2", 330, now),
                ("moment-2-00-08-45", "2", 525, now),
                ("moment-3-00-02-15", "3", 135, now),
                ("moment-3-00-05-30", "3", 330, now),
                ("moment-3-00-08-45", "3", 525, now),
            ]
            
            cursor.executemany(
                "INSERT INTO moments (id, video_id, timestamp_seconds, created_at) VALUES (?, ?, ?, ?)",
                demo_moments
            )
            
            conn.commit()
            logger.info(f"Seeded {len(demo_videos)} videos and {len(demo_moments)} moments")
        else:
            logger.info("Database already has data, skipping seed")
            
    except Exception as e:
        logger.error(f"Error seeding demo data: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


def check_db_health() -> bool:
    """Check database connectivity"""
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        conn.close()
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
