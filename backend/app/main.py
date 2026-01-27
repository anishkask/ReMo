"""
ReMo Backend - FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.auth.transport import requests
from google.oauth2 import id_token
import os

app = FastAPI(
    title="ReMo API",
    description="Backend API for ReMo - Real-time Media Moments",
    version="0.1.0"
)

# Configure CORS
# Allow localhost for development and any deployed frontend URL
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5176,http://localhost:5177").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "ReMo API is running", "status": "ok"}


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


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
async def auth_google(request_body: GoogleAuthRequest):
    """
    Authenticate with Google ID token
    Returns access token and user info
    """
    try:
        # Verify the Google ID token
        CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "632365523992-df065eqhlv3kh0io083e1bn6v54ggeee.apps.googleusercontent.com")
        
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
        raise HTTPException(status_code=401, detail=f"Invalid Google ID token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
