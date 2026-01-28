# ReMo Backend

FastAPI backend for the ReMo application.

## Architecture

**Important:** The backend follows a single-file architecture. All code lives in `app/main.py` until at least 2 real endpoints exist. No models/, schemas/, services/, or layered architecture should be introduced yet. This keeps the codebase simple and avoids premature abstractions.

## Quick Start

### Option 1: Use Startup Script (Recommended)

**Windows:**
```bash
cd backend
start.bat
```

**Linux/Mac/WSL:**
```bash
cd backend
chmod +x start.sh
./start.sh
```

### Option 2: Manual Setup

1. Create a virtual environment (if not exists):
```bash
python -m venv venv
source venv/bin/activate  # On WSL/Unix
# or: venv\Scripts\activate  # On Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the development server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Database Setup

The backend uses SQLite by default (stored in `remo.db` in the backend directory). The database is automatically created on first run.

### Seeding Sample Videos

To populate the database with sample videos, call the seed endpoint:

```bash
curl -X POST http://127.0.0.1:8000/seed
```

Or visit `http://127.0.0.1:8000/seed` in your browser (if using GET, change to POST in Swagger UI).

The frontend will automatically seed the database if it's empty when loading videos.

### Database Schema

**videos** table:
- `id` (string/uuid, primary key)
- `owner_id` (string, nullable)
- `title` (string, required)
- `description` (text, nullable)
- `storage_provider` (string, nullable: 's3'|'supabase'|'gcs')
- `object_key` (string, nullable)
- `video_url` (string, required) - URL to video file in blob storage
- `thumbnail_url` (string, nullable)
- `duration_seconds` (integer, nullable)
- `created_at` (timestamp)

**comments** table:
- `id` (string/uuid, primary key)
- `video_id` (string, foreign key -> videos.id)
- `author_name` (string, nullable)
- `author_id` (string, nullable)
- `timestamp_seconds` (float, required)
- `body` (text, required)
- `created_at` (timestamp)

## API Endpoints

- `GET /videos` - Get all videos
- `GET /videos/{id}` - Get a single video
- `GET /videos/{id}/comments` - Get comments for a video
- `POST /videos/{id}/comments` - Create a comment
- `POST /seed` - Seed database with sample videos

## Verify Backend is Running

1. Open browser: `http://127.0.0.1:8000/health`
   - Should return: `{"status":"healthy"}`

2. Open API docs: `http://127.0.0.1:8000/docs`
   - Should show Swagger UI with all endpoints

3. Check videos endpoint: `http://127.0.0.1:8000/videos`
   - Should return an array (empty if not seeded)

## Troubleshooting

- **Port 8000 already in use**: Kill the process or change port
- **Module not found errors**: Run `pip install -r requirements.txt`
- **Connection refused**: Make sure backend is running and accessible at `http://127.0.0.1:8000`
- **Database errors**: Delete `remo.db` and restart the server to recreate the database