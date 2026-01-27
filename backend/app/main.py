"""
ReMo Backend - FastAPI Application Entry Point
"""
import os
import logging
import uuid
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from app.auth import (
    verify_google_id_token,
    create_access_token,
    get_current_user,
    upsert_user,
    verify_access_token
)
from app.db import get_conn, init_db, seed_demo_data, check_db_health

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ReMo API",
    description="Backend API for ReMo - Real-time Media Moments",
    version="0.1.0"
)

# Configure CORS
# Allow localhost for development and any deployed frontend URL
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    try:
        init_db()
        seed_demo_data()
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "ReMo API is running", "status": "ok"}


@app.get("/health")
async def health():
    """Health check endpoint with database connectivity check"""
    db_healthy = check_db_health()
    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": "connected" if db_healthy else "disconnected"
    }


# Helper function to get optional authenticated user
async def get_optional_user(request: Request) -> Optional[dict]:
    """Get current user if authenticated, None otherwise"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    try:
        token = auth_header.split(" ")[1]
        # Use jwt directly to avoid HTTPException
        import jwt
        import os
        JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
        JWT_ALGORITHM = "HS256"
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {
            "id": payload.get("sub"),
            "email": payload.get("email", ""),
            "name": payload.get("name", "")
        }
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        # Return None if token is invalid (user is not authenticated)
        return None


# Request/Response models
class GoogleAuthRequest(BaseModel):
    id_token: str


class VideoCreate(BaseModel):
    id: str
    title: str
    url: str


class CommentCreate(BaseModel):
    timestamp_seconds: int
    text: str
    display_name: Optional[str] = None
    moment_id: Optional[str] = None


# Auth endpoint
@app.post("/auth/google")
async def auth_google(request_body: GoogleAuthRequest):
    """
    Authenticate with Google ID token
    Returns our JWT access token and user info
    """
    try:
        # Verify Google ID token
        google_user = verify_google_id_token(request_body.id_token)
        
        # Upsert user in store
        user = upsert_user(google_user)
        
        # Create our JWT access token
        access_token = create_access_token(
            user_id=user['id'],
            email=user['email'],
            name=user['name']
        )
        
        return {
            "access_token": access_token,
            "user": {
                "id": user['id'],
                "email": user['email'],
                "name": user['name'],
                "picture": user.get('picture', ''),
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# Video endpoints
@app.get("/videos")
async def get_videos():
    """Get all videos"""
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, url, created_at FROM videos ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        return {
            "videos": [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "url": row["url"],
                    "created_at": row["created_at"]
                }
                for row in rows
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching videos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/videos")
async def create_video(video: VideoCreate):
    """Create or update a video"""
    try:
        conn = get_conn()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        
        cursor.execute("""
            INSERT OR REPLACE INTO videos (id, title, url, created_at)
            VALUES (?, ?, ?, COALESCE((SELECT created_at FROM videos WHERE id = ?), ?))
        """, (video.id, video.title, video.url, video.id, now))
        
        conn.commit()
        conn.close()
        
        return {"id": video.id, "title": video.title, "url": video.url, "created_at": now}
    except Exception as e:
        logger.error(f"Error creating video: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Moment endpoints
@app.get("/moments")
async def get_moments():
    """Get all moments (backward compatibility - returns all moments from all videos)"""
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, video_id, timestamp_seconds, created_at
            FROM moments
            ORDER BY timestamp_seconds
        """)
        rows = cursor.fetchall()
        conn.close()
        
        # Convert to old format for backward compatibility
        moments = []
        for row in rows:
            # Convert seconds to timestamp string
            seconds = row["timestamp_seconds"]
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = seconds % 60
            
            if hours > 0:
                timestamp = f"{hours:02d}:{minutes:02d}:{secs:02d}"
            else:
                timestamp = f"{minutes:02d}:{secs:02d}"
            
            moments.append({
                "id": row["id"],
                "timestamp": timestamp,
                "text": f"Moment at {timestamp}"  # Default text
            })
        
        return {"moments": moments}
    except Exception as e:
        logger.error(f"Error fetching moments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/videos/{video_id}/moments")
async def get_video_moments(video_id: str):
    """Get moments for a specific video, sorted by timestamp"""
    try:
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, video_id, timestamp_seconds, created_at
            FROM moments
            WHERE video_id = ?
            ORDER BY timestamp_seconds
        """, (video_id,))
        rows = cursor.fetchall()
        conn.close()
        
        moments = []
        for row in rows:
            seconds = row["timestamp_seconds"]
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            secs = seconds % 60
            
            if hours > 0:
                timestamp = f"{hours:02d}:{minutes:02d}:{secs:02d}"
            else:
                timestamp = f"{minutes:02d}:{secs:02d}"
            
            moments.append({
                "id": row["id"],
                "video_id": row["video_id"],
                "timestamp": timestamp,
                "timestamp_seconds": row["timestamp_seconds"],
                "created_at": row["created_at"]
            })
        
        return {"moments": moments}
    except Exception as e:
        logger.error(f"Error fetching video moments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/moments")
async def create_moment(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new moment (requires authentication)
    Note: This endpoint maintains backward compatibility but stores in DB
    """
    try:
        body = await request.json()
        timestamp = body.get("timestamp", "")
        text = body.get("text", "")
        video_id = body.get("video_id", "1")  # Default to video 1 for backward compat
        
        # Parse timestamp to seconds
        parts = timestamp.split(":")
        if len(parts) == 2:
            seconds = int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            seconds = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        else:
            raise HTTPException(status_code=400, detail="Invalid timestamp format")
        
        moment_id = f"moment-{video_id}-{timestamp.replace(':', '-')}"
        now = datetime.utcnow().isoformat()
        
        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO moments (id, video_id, timestamp_seconds, created_at)
            VALUES (?, ?, ?, ?)
        """, (moment_id, video_id, seconds, now))
        
        conn.commit()
        conn.close()
        
        return {
            "moment": {
                "id": moment_id,
                "timestamp": timestamp,
                "text": text
            }
        }
    except Exception as e:
        logger.error(f"Error creating moment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Comment endpoints
@app.get("/videos/{video_id}/comments")
async def get_comments(
    video_id: str,
    after: Optional[int] = Query(None, description="Filter comments after this timestamp in seconds"),
    before: Optional[int] = Query(None, description="Filter comments before this timestamp in seconds"),
    limit: int = Query(200, description="Maximum number of comments to return")
):
    """Get comments for a video, sorted by timestamp_seconds"""
    try:
        conn = get_conn()
        cursor = conn.cursor()
        
        query = "SELECT * FROM comments WHERE video_id = ?"
        params = [video_id]
        
        if after is not None:
            query += " AND timestamp_seconds >= ?"
            params.append(after)
        
        if before is not None:
            query += " AND timestamp_seconds <= ?"
            params.append(before)
        
        query += " ORDER BY timestamp_seconds, created_at LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        comments = [
            {
                "id": row["id"],
                "video_id": row["video_id"],
                "moment_id": row["moment_id"],
                "timestamp_seconds": row["timestamp_seconds"],
                "user_id": row["user_id"],
                "display_name": row["display_name"],
                "text": row["text"],
                "created_at": row["created_at"]
            }
            for row in rows
        ]
        
        return {"comments": comments}
    except Exception as e:
        logger.error(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/videos/{video_id}/comments")
async def create_comment(
    video_id: str,
    comment: CommentCreate,
    request: Request
):
    """
    Create a comment for a video
    If authenticated, uses auth user info; otherwise uses provided display_name
    """
    try:
        # Try to get authenticated user
        user = await get_optional_user(request)
        
        # Determine user_id and display_name
        if user:
            user_id = user["id"]
            display_name = comment.display_name or user.get("name") or user.get("email", "User")
        else:
            user_id = None
            display_name = comment.display_name
        
        if not display_name:
            raise HTTPException(status_code=400, detail="display_name is required for unauthenticated users")
        
        # Generate comment ID
        comment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        conn = get_conn()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO comments (
                id, video_id, moment_id, timestamp_seconds,
                user_id, display_name, text, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            comment_id, video_id, comment.moment_id, comment.timestamp_seconds,
            user_id, display_name, comment.text, now
        ))
        
        conn.commit()
        
        # Fetch the created comment
        cursor.execute("SELECT * FROM comments WHERE id = ?", (comment_id,))
        row = cursor.fetchone()
        conn.close()
        
        return {
            "id": row["id"],
            "video_id": row["video_id"],
            "moment_id": row["moment_id"],
            "timestamp_seconds": row["timestamp_seconds"],
            "user_id": row["user_id"],
            "display_name": row["display_name"],
            "text": row["text"],
            "created_at": row["created_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
