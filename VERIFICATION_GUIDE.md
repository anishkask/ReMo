# Comment Persistence Verification Guide

## Backend Changes Summary

### Files Modified

1. **`backend/app/db.py`**
   - Added startup logging for DATABASE_URL
   - Added `DB_SCHEME` global variable (sqlite/postgresql)
   - Added `get_db_info()` function for debug endpoint
   - Enhanced logging throughout

2. **`backend/app/main.py`**
   - Added startup logging: database scheme, DATABASE_URL status, tables present, comment count
   - Added detailed logging in GET/POST endpoints: logs when querying/inserting comments
   - Added `/debug/db` endpoint for database verification
   - All comment operations use database (no in-memory storage)

### Database Storage Verification

**Comments are stored in:**
- ✅ **Postgres** (production) when `DATABASE_URL` is set
- ✅ **SQLite** (local dev) when `DATABASE_URL` is not set
- ❌ **NOT in-memory** - all operations use SQLAlchemy sessions

**Evidence:**
- `POST /videos/{video_id}/comments` uses `db.add()` + `db.commit()` (lines 180-181)
- `GET /videos/{video_id}/comments` uses `db.query(Comment)` (line 146)
- No in-memory dictionaries or lists for comments

## Local Verification Steps

### 1. Start Backend

```bash
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1  # Windows PowerShell
# OR: source venv/bin/activate  # Linux/Mac/WSL

# Start backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Check startup logs for:**
```
[DB] DATABASE_URL is set: sqlite:///./remo.db
[DB] Using SQLite database (local development)
[STARTUP] Database URL scheme: sqlite
[STARTUP] DATABASE_URL set: No (using default SQLite)
[STARTUP] Database tables created/verified
[STARTUP] Existing tables: ['videos', 'comments']
[STARTUP] Total comments in database: 0
```

### 2. Check Debug Endpoint

```bash
# In another terminal or browser
curl http://127.0.0.1:8000/debug/db
```

**Expected response (SQLite):**
```json
{
  "db_url_scheme": "sqlite",
  "db_host": "unknown",
  "tables_present": ["videos", "comments"],
  "comment_count": 0,
  "database_url_set": false,
  "expected_tables": ["videos", "comments"],
  "all_tables_present": true
}
```

### 3. POST a Comment

```bash
curl -X POST http://127.0.0.1:8000/videos/{video_id}/comments \
  -H "Content-Type: application/json" \
  -d '{
    "author_name": "Test User",
    "author_id": "test-123",
    "timestamp_seconds": 30.5,
    "body": "Test comment"
  }'
```

**Check backend logs for:**
```
[BACKEND] POST /videos/{video_id}/comments - Creating comment: author=Test User...
[DB] Inserting comment into database for video_id={video_id}
[DB] Comment successfully inserted into database: id=..., video_id=..., created_at=...
```

### 4. GET Comments

```bash
curl http://127.0.0.1:8000/videos/{video_id}/comments
```

**Check backend logs for:**
```
[DB] Querying comments for video_id={video_id} from database
[DB] Found 1 comments for video_id={video_id} in database
[BACKEND] GET /videos/{video_id}/comments - Returning 1 comments
```

### 5. Verify Persistence

1. POST a comment (step 3)
2. **Restart the backend server** (Ctrl+C, then restart)
3. GET comments (step 4)
4. **Comment should still be there** ✅

### 6. Check Debug Endpoint Again

```bash
curl http://127.0.0.1:8000/debug/db
```

**Expected response:**
```json
{
  "comment_count": 1,  // Should show the comment you posted
  ...
}
```

## Render Production Verification Steps

### 1. Check Environment Variables

In Render Dashboard → Your Backend Service → Environment:
- ✅ `DATABASE_URL` = `<Render Postgres Internal Database URL>`
- ✅ `ALLOWED_ORIGINS` = `https://remo-nine.vercel.app,http://localhost:5177`

### 2. Check Startup Logs

In Render Dashboard → Your Backend Service → Logs, look for:
```
[DB] DATABASE_URL is set: dpg-xxxxx-a.oregon-postgres.render.com:5432/remo_xxxx
[DB] Using Postgres database (production)
[STARTUP] Database URL scheme: postgresql
[STARTUP] DATABASE_URL set: Yes
[STARTUP] Database tables created/verified
[STARTUP] Existing tables: ['videos', 'comments']
[STARTUP] Total comments in database: X
```

### 3. Check Debug Endpoint

```bash
curl https://your-backend.onrender.com/debug/db
```

**Expected response (Postgres):**
```json
{
  "db_url_scheme": "postgresql",
  "db_host": "dpg-xxxxx-a.oregon-postgres.render.com:5432",
  "tables_present": ["videos", "comments"],
  "comment_count": 0,
  "database_url_set": true,
  "expected_tables": ["videos", "comments"],
  "all_tables_present": true
}
```

### 4. Test Comment Persistence

1. POST a comment via frontend or curl
2. **Restart the Render service** (Manual Deploy → Redeploy)
3. GET comments
4. **Comment should still exist** ✅

### 5. Verify No Infinite Loops

1. Open frontend in browser DevTools → Network tab
2. Select a video
3. **Should see only ONE GET /videos/{video_id}/comments request**
4. **No repeated/pending requests** ✅
5. Post a comment
6. **Should see ONE POST request, then ONE GET request** (not multiple) ✅

## Frontend Verification

### Check Comment Fetching Logic

The `useEffect` in `frontend/src/App.jsx` (line 507) has correct dependencies:
```javascript
useEffect(() => {
  // ... fetch comments
}, [selectedVideoId, apiStatus]) // ONLY these two - no comments, no momentsByVideoId
```

**This ensures:**
- ✅ Comments fetch only when `selectedVideoId` changes
- ✅ Comments fetch only when `apiStatus` changes to 'connected'
- ✅ No infinite loops from dependency on `commentsByVideoId` or `momentsByVideoId`

### Check Post Comment Logic

After POST (line 712):
- ✅ Optimistically updates UI
- ✅ Re-fetches comments **once** via `fetchCommentsForVideo()` (not via useEffect)
- ✅ No state dependencies that would trigger useEffect

## Troubleshooting

### Comments Not Persisting

1. Check `/debug/db` endpoint:
   - `db_url_scheme` should be "postgresql" in production
   - `all_tables_present` should be `true`
   - `comment_count` should increase after POST

2. Check backend logs:
   - Look for `[DB] Inserting comment into database`
   - Look for `[DB] Comment successfully inserted`
   - If missing, comment is not being saved

3. Verify DATABASE_URL:
   - In Render: Check environment variables
   - Should start with `postgresql://` or `postgres://`

### Infinite Request Loop

1. Check browser DevTools → Network tab
2. Filter by `/comments`
3. If requests keep increasing:
   - Check `useEffect` dependencies in `App.jsx` line 544
   - Should only be `[selectedVideoId, apiStatus]`
   - Remove any dependencies on `commentsByVideoId`, `momentsByVideoId`, or `allVideos`

4. Check console logs:
   - Should see `"Fetching comments for {videoId}"` only once per video change
   - If repeated, there's a loop

### Database Connection Issues

1. Check `/health` endpoint:
   ```bash
   curl https://your-backend.onrender.com/health
   ```
   Should return: `{"status": "healthy", "database": "connected"}`

2. Check Render Postgres:
   - Ensure Postgres database is running
   - Check Internal Database URL is correct
   - Verify DATABASE_URL env var is set

## Summary

✅ **Comments are stored in Postgres/SQLite (not in-memory)**
✅ **All operations use SQLAlchemy sessions**
✅ **No infinite fetch loops (proper useEffect dependencies)**
✅ **Debug endpoint available at `/debug/db`**
✅ **Comprehensive logging for troubleshooting**
