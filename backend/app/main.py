"""
ReMo Backend - FastAPI Application Entry Point
"""
from fastapi import FastAPI
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


# Mock moments data
moments_data = [
    {"id": 1, "timestamp": "00:02:15", "text": "Key moment in the video"},
    {"id": 2, "timestamp": "00:05:30", "text": "Important scene here"},
    {"id": 3, "timestamp": "00:08:45", "text": "Great reaction moment"},
]


@app.get("/moments")
async def get_moments():
    """Get all moments"""
    return {"moments": moments_data}
