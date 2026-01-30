"""
ReMo Backend - FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from datetime import datetime
from typing import List, Optional
import os
import uuid
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./remo.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Video(Base):
    __tablename__ = "videos"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    storage_provider = Column(String, nullable=True)  # 's3'|'supabase'|'gcs'|None
    object_key = Column(String, nullable=True)
    video_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    comments = relationship("Comment", back_populates="video", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String, ForeignKey("videos.id"), nullable=False)
    author_name = Column(String, nullable=True)
    author_id = Column(String, nullable=True)
    timestamp_seconds = Column(Float, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    video = relationship("Video", back_populates="comments")

# Create tables
Base.metadata.create_all(bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
    return {"status": "healthy"}


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
    timestamp_seconds: float
    body: str

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
    """Get all comments for a video, ordered by timestamp then created_at"""
    # Verify video exists
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    comments = db.query(Comment).filter(
        Comment.video_id == video_id
    ).order_by(Comment.timestamp_seconds, Comment.created_at).all()
    
    print(f"[BACKEND] GET /videos/{video_id}/comments - Returning {len(comments)} comments")
    return comments

@app.post("/videos/{video_id}/comments", response_model=CommentResponse)
async def create_comment(video_id: str, comment: CommentCreate, db: Session = Depends(get_db)):
    """Create a new comment for a video"""
    # Verify video exists
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    print(f"[BACKEND] POST /videos/{video_id}/comments - Creating comment: author={comment.author_name}, timestamp={comment.timestamp_seconds}, body={comment.body[:50]}...")
    
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
    
    print(f"[BACKEND] Comment created with ID: {db_comment.id}")
    return db_comment


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
