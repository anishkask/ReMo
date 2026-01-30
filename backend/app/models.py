"""
SQLAlchemy models for ReMo database
"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()


class Video(Base):
    """Video model"""
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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship to comments
    comments = relationship("Comment", back_populates="video", cascade="all, delete-orphan")


class Comment(Base):
    """Comment model for video comments"""
    __tablename__ = "comments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    video_id = Column(String, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    author_name = Column(String, nullable=True)
    author_id = Column(String, nullable=True)
    timestamp_seconds = Column(Float, nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationship to video
    video = relationship("Video", back_populates="comments")
