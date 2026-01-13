"""
ReMo Backend - FastAPI Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="ReMo API",
    description="Backend API for ReMo - Real-time Media Moments",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
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
