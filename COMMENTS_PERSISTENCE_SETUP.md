# Comments Persistence Setup - Implementation Summary

## Files Changed

### Backend Changes

1. **`backend/app/db.py`** (Already correct)
   - Uses `DATABASE_URL` env var with Postgres support
   - Converts `postgres://` to `postgresql+psycopg2://` for Render compatibility
   - Connection pooling configured for production

2. **`backend/app/models.py`** (Updated)
   - Changed `datetime.utcnow` to `datetime.now(timezone.utc)` for timezone-aware timestamps
   - Comment model has all required fields: id, video_id, author_id, author_name, body, timestamp_seconds, created_at

3. **`backend/app/main.py`** (Updated)
   - DELETE endpoint changed from `/comments/{comment_id}` to `/videos/{video_id}/comments/{comment_id}`
   - GET endpoint orders by `timestamp_seconds ASC, created_at ASC`
   - POST endpoint commits to database with `db.commit()`
   - All endpoints use database (no in-memory storage)

4. **`backend/alembic/env.py`** (Updated)
   - Added postgres:// to postgresql+psycopg2:// conversion for Render compatibility

5. **`backend/Dockerfile`** (Already correct)
   - Runs `alembic upgrade head` before starting uvicorn
   - Ensures migrations run on deploy

### Frontend Changes

1. **`frontend/src/services/api.js`** (Updated)
   - `deleteComment()` now takes `videoId` as first parameter
   - API base URL never references localhost in production

2. **`frontend/src/App.jsx`** (Already fixed)
   - Comment fetching only happens on `selectedVideoId` or `apiStatus` change
   - No infinite loops - proper dependency array `[selectedVideoId, apiStatus]`
   - Delete handler updated to use new endpoint path

3. **`frontend/src/utils/time.js`** (Updated)
   - Timestamp format: "now" (< 60s), "X min ago", "X hours ago", "X days ago" (< 7 days), "MM/DD/YY" (7+ days)

4. **`frontend/vite.config.js`** (Already correct)
   - Port set to 5177 with `strictPort: true`

## Local Testing Commands

### Start Backend
```bash
cd backend

# Activate virtual environment (Windows)
.\venv\Scripts\Activate.ps1
# Or (Linux/Mac/WSL)
source venv/bin/activate

# Install dependencies if needed
pip install -r requirements.txt

# Run migrations (if using SQLite locally)
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Start Frontend
```bash
cd frontend

# Install dependencies if needed
npm install

# Start dev server (will run on port 5177)
npm run dev
```

### Test Comment Persistence
1. Open frontend at `http://localhost:5177`
2. Select a video
3. Post a comment at a timestamp
4. **Refresh the page** - comment should still be visible
5. Open in **incognito/private window** - comment should be visible to all users
6. Delete your own comment - should work
7. Try to delete someone else's comment - should fail with 403

## Render Deployment Settings

### Backend Service (Render)
**Environment Variables:**
- `DATABASE_URL` = `<Render Postgres Internal Database URL>`
  - Get this from Render Dashboard → Your Postgres Database → Internal Database URL
  - Should look like: `postgresql://user:pass@host:5432/dbname`
- `ALLOWED_ORIGINS` = `https://remo-nine.vercel.app,http://localhost:5177`
  - Include your Vercel frontend domain(s)
  - Include localhost:5177 for local development
- `GOOGLE_CLIENT_ID` = `<your-google-oauth-client-id>`

**Build Command:** (Leave empty - Dockerfile handles it)

**Start Command:** (Leave empty - Dockerfile CMD handles it)

### Frontend Service (Vercel)
**Environment Variables:**
- `VITE_API_BASE_URL` = `https://remo-1-3bvf.onrender.com`
  - Replace with your actual Render backend URL

## Verification Checklist

After deployment, verify:

- [ ] Backend `/health` endpoint shows `"database": "connected"`
- [ ] Post a comment, refresh page → comment persists
- [ ] Post a comment as User A, view as User B → comment visible
- [ ] Delete button only appears on your own comments
- [ ] Timestamps show correctly: "now", "10 min ago", "5 hours ago", or "MM/DD/YY"
- [ ] No infinite request loops in browser Network tab
- [ ] Comments persist after redeploying backend service

## Database Schema

**Comments Table:**
- `id` (UUID primary key)
- `video_id` (string, indexed via ForeignKey)
- `author_id` (string nullable)
- `author_name` (string nullable)
- `body` (text)
- `timestamp_seconds` (float)
- `created_at` (timezone-aware datetime, default now)

**Videos Table:** (already exists)
- Used for foreign key relationship
- Comments cascade delete when video is deleted

## API Endpoints

- `GET /videos/{video_id}/comments` - Returns comments sorted by timestamp_seconds ASC, then created_at ASC
- `POST /videos/{video_id}/comments` - Creates comment, returns with id + created_at
- `DELETE /videos/{video_id}/comments/{comment_id}` - Deletes comment (author-only)

## Notes

- Comments are stored in Postgres (production) or SQLite (local dev)
- Frontend never references localhost in production builds
- Comment fetching only happens on video change or after post/delete
- Timestamps are timezone-aware (UTC) in database
- Delete requires matching `author_id` (guest comments cannot be deleted)
