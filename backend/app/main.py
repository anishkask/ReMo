"""
ReMo Backend - FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
import os
import uuid
import logging

# Import database and models
from app.db import get_db, check_db_connection, engine
from app.models import Video, Comment, Base

# Create tables on startup (idempotent - safe to run multiple times)
Base.metadata.create_all(bind=engine)
logger.info("Database tables created/verified")

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
# Ensure localhost:5177 is included for strict port enforcement
# Production: Set ALLOWED_ORIGINS env var with comma-separated Vercel domains
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5176,http://localhost:5177")
allowed_origins = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]

# Log allowed origins (without sensitive data)
logger.info(f"[CORS] Allowed origins: {', '.join(allowed_origins)}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods including OPTIONS for preflight
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "ReMo API is running", "status": "ok"}


@app.get("/health")
async def health():
    """Health check endpoint - CORS middleware handles OPTIONS automatically"""
    db_healthy = check_db_connection()
    return {
        "status": "healthy",
        "database": "connected" if db_healthy else "disconnected"
    }


# Pydantic models for request/response
class VideoResponse(BaseModel):
    id: str
    owner_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    storage_provider: Optional[str] = None
    object_key: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    author_name: Optional[str] = None
    author_id: Optional[str] = None
    timestamp_seconds: float = Field(ge=0, description="Timestamp in seconds (must be >= 0)")
    body: str = Field(min_length=1, max_length=5000, description="Comment text (1-5000 characters)")
    
    @field_validator('body')
    @classmethod
    def validate_body(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Comment body cannot be empty')
        return v.strip()

class CommentResponse(BaseModel):
    id: str
    video_id: str
    author_name: Optional[str] = None
    author_id: Optional[str] = None
    timestamp_seconds: float
    body: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Video endpoints
@app.get("/videos", response_model=List[VideoResponse])
async def get_videos(db: Session = Depends(get_db)):
    """Get all videos"""
    videos = db.query(Video).order_by(Video.created_at.desc()).all()
    return videos

@app.get("/videos/{video_id}", response_model=VideoResponse)
async def get_video(video_id: str, db: Session = Depends(get_db)):
    """Get a single video by ID"""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

@app.get("/videos/{video_id}/comments", response_model=List[CommentResponse])
async def get_comments(video_id: str, db: Session = Depends(get_db)):
    """
    Get all comments for a video, ordered by created_at ascending.
    Returns empty list if video has no comments.
    """
    try:
        # Verify video exists
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        # Get comments ordered by timestamp_seconds ASC, then created_at ASC
        # This groups comments by video position, then shows oldest first within each position
        comments = db.query(Comment).filter(
            Comment.video_id == video_id
        ).order_by(Comment.timestamp_seconds.asc(), Comment.created_at.asc()).all()
        
        logger.info(f"[BACKEND] GET /videos/{video_id}/comments - Returning {len(comments)} comments")
        return comments
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[BACKEND] Error fetching comments for video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch comments")

@app.post("/videos/{video_id}/comments", response_model=CommentResponse)
async def create_comment(video_id: str, comment: CommentCreate, db: Session = Depends(get_db)):
    """
    Create a new comment for a video.
    Validates input and persists to database.
    """
    try:
        # Verify video exists
        video = db.query(Video).filter(Video.id == video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
        
        logger.info(f"[BACKEND] POST /videos/{video_id}/comments - Creating comment: author={comment.author_name}, timestamp={comment.timestamp_seconds}, body={comment.body[:50]}...")
        
        # Create comment
        db_comment = Comment(
            video_id=video_id,
            author_name=comment.author_name,
            author_id=comment.author_id,
            timestamp_seconds=comment.timestamp_seconds,
            body=comment.body
        )
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        
        logger.info(f"[BACKEND] Comment created with ID: {db_comment.id}, created_at: {db_comment.created_at}")
        return db_comment
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[BACKEND] Error creating comment for video {video_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create comment")


@app.delete("/videos/{video_id}/comments/{comment_id}")
async def delete_comment(
    video_id: str,
    comment_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Delete a comment.
    Authorization: Only the comment author (matching author_id) can delete.
    For guest comments (author_id is null), deletion is not allowed.
    Returns 204 No Content on success.
    """
    try:
        # Get comment
        comment = db.query(Comment).filter(
            Comment.id == comment_id,
            Comment.video_id == video_id
        ).first()
        
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        
        # Get current user ID from query parameter (frontend passes user_id)
        # In production, this should come from verified JWT token
        user_id_param = request.query_params.get("user_id")
        
        # Check authorization
        if not comment.author_id:
            # Guest comment (author_id is null) - don't allow deletion
            raise HTTPException(
                status_code=403,
                detail="Guest comments cannot be deleted"
            )
        
        # Authenticated comment - require matching author_id
        if not user_id_param:
            raise HTTPException(
                status_code=403,
                detail="Authentication required to delete comments"
            )
        
        if user_id_param != comment.author_id:
            raise HTTPException(
                status_code=403,
                detail="You can only delete your own comments"
            )
        
        # Authorized - delete the comment
        db.delete(comment)
        db.commit()
        
        logger.info(f"[BACKEND] Comment {comment_id} deleted by user {user_id_param}")
        # Return 204 No Content
        from fastapi.responses import Response
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"[BACKEND] Error deleting comment {comment_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete comment")


# Seed endpoint for development
@app.post("/seed")
async def seed_database(db: Session = Depends(get_db)):
    """Seed database with sample videos (only if empty)"""
    existing_count = db.query(Video).count()
    if existing_count > 0:
        return {"message": f"Database already has {existing_count} videos. Skipping seed."}
    
    sample_videos = [
        Video(
            id=str(uuid.uuid4()),
            title="Big Buck Bunny",
            description="A sample video from Google's test bucket",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            storage_provider=None,
            duration_seconds=None
        ),
        Video(
            id=str(uuid.uuid4()),
            title="Elephant's Dream",
            description="A sample video from Google's test bucket",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            storage_provider=None,
            duration_seconds=None
        ),
        Video(
            id=str(uuid.uuid4()),
            title="For Bigger Blazes",
            description="A sample video from Google's test bucket",
            video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            storage_provider=None,
            duration_seconds=None
        )
    ]
    
    for video in sample_videos:
        db.add(video)
    
    db.commit()
    
    return {
        "message": f"Seeded {len(sample_videos)} sample videos",
        "videos": [{"id": v.id, "title": v.title} for v in sample_videos]
    }


# In-memory storage for moments
moments_data = [
    {"id": 1, "timestamp": "00:02:15", "text": "Key moment in the video"},
    {"id": 2, "timestamp": "00:05:30", "text": "Important scene here"},
    {"id": 3, "timestamp": "00:08:45", "text": "Great reaction moment"},
]


@app.get("/moments")
async def get_moments():
    """Get all moments"""
    return {"moments": moments_data}


@app.post("/moments")
async def create_moment(request: Request):
    """Create a new moment"""
    body = await request.json()
    timestamp = body.get("timestamp", "")
    text = body.get("text", "")
    
    # Auto-increment id
    next_id = max([m["id"] for m in moments_data], default=0) + 1
    
    new_moment = {
        "id": next_id,
        "timestamp": timestamp,
        "text": text
    }
    
    moments_data.append(new_moment)
    return {"moment": new_moment}


# Google OAuth Models
class GoogleAuthRequest(BaseModel):
    id_token: str


@app.post("/auth/google")
async def auth_google(request_body: GoogleAuthRequest, request: Request):
    """
    Authenticate with Google ID token
    Returns access token and user info
    CORS middleware handles OPTIONS preflight automatically
    """
    # Log request origin for debugging
    origin = request.headers.get("origin", "unknown")
    logger.info(f"[AUTH] Google OAuth request from origin: {origin}")
    
    try:
        # Verify the Google ID token
        CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "632365523992-df065eqhlv3kh0io083e1bn6v54ggeee.apps.googleusercontent.com")
        
        if not CLIENT_ID:
            logger.error("[AUTH] GOOGLE_CLIENT_ID not configured")
            raise HTTPException(status_code=500, detail="Google OAuth not configured")
        
        idinfo = id_token.verify_oauth2_token(
            request_body.id_token,
            requests.Request(),
            CLIENT_ID
        )
        
        # Extract user information
        user_email = idinfo.get("email")
        user_name = idinfo.get("name", user_email)
        user_picture = idinfo.get("picture", "")
        user_id = idinfo.get("sub")
        
        # In a real app, you would:
        # 1. Check if user exists in your database
        # 2. Create user if doesn't exist
        # 3. Generate your own JWT token
        # 4. Return token + user info
        
        # For now, return a simple access token (in production, use proper JWT)
        import hashlib
        access_token = hashlib.sha256(f"{user_id}{user_email}".encode()).hexdigest()
        
        logger.info(f"[AUTH] Successfully authenticated user: {user_email}")
        return {
            "access_token": access_token,
            "user": {
                "id": user_id,
                "email": user_email,
                "name": user_name,
                "picture": user_picture,
            }
        }
    except ValueError as e:
        # Invalid token
        logger.warning(f"[AUTH] Invalid Google ID token: {str(e)}")
        raise HTTPException(status_code=401, detail=f"Invalid Google ID token: {str(e)}")
    except Exception as e:
        logger.error(f"[AUTH] Authentication error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
