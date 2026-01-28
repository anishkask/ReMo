# Comment Persistence Fix - Implementation Summary

## Problem
Comments were not persisting after page refresh or navigation. Comments were being saved to the backend database but never loaded back from the backend.

## Root Cause
- Comments were POSTed to backend API (`POST /videos/{video_id}/comments`) ✅
- Comments were NEVER fetched from backend (`GET /videos/{video_id}/comments`) ❌
- Comments were only loaded from localStorage, which doesn't persist properly across sessions
- No useEffect hook to load comments when a video is selected

## Solution Implemented

### Files Changed

1. **`frontend/src/App.jsx`**
   - Added `useEffect` hook to fetch comments from backend when video is selected (lines 397-485)
   - Updated comment posting logic to use backend response data (lines 601-687)
   - Comments now load from backend for API videos on video selection
   - Comments fall back to localStorage if backend is unavailable

2. **`backend/app/main.py`**
   - Added logging to comment endpoints for verification (lines 152, 165-166)
   - Improved comment ordering to include `created_at` for consistent ordering (line 154)

### Key Changes

#### 1. Comment Loading (Frontend)
```javascript
// NEW: Load comments from backend when video is selected
useEffect(() => {
  if (!selectedVideoId || apiStatus !== 'connected') return
  
  const currentVideo = allVideos.find(v => v.id === selectedVideoId)
  const isApiVideo = currentVideo?.sourceType === 'api'
  
  if (isApiVideo) {
    // Fetch comments from backend
    getComments(selectedVideoId)
      .then((backendComments) => {
        // Convert backend format to frontend format
        // Group by moments
        // Update state
      })
  }
}, [selectedVideoId, apiStatus, momentsByVideoId, allVideos])
```

#### 2. Comment Posting (Frontend)
```javascript
// Updated: Use backend response data instead of optimistic update
if (isApiVideo && apiStatus === 'connected') {
  const savedComment = await postComment(selectedVideoId, {
    author_name: authorName,
    author_id: authUser?.id || null,
    timestamp_seconds: timestampSeconds,
    body: commentText.trim()
  })
  
  // Use backend comment ID and timestamps
  const backendComment = {
    id: savedComment.id,
    text: savedComment.body,
    author: savedComment.author_name || authorName,
    createdAt: savedComment.created_at,
    timestampSeconds: savedComment.timestamp_seconds
  }
  
  // Update state with backend data
}
```

#### 3. Backend Logging
```python
# Added logging for verification
print(f"[BACKEND] GET /videos/{video_id}/comments - Returning {len(comments)} comments")
print(f"[BACKEND] POST /videos/{video_id}/comments - Creating comment: author={comment.author_name}...")
print(f"[BACKEND] Comment created with ID: {db_comment.id}")
```

## Database Schema (Already Correct)

The `comments` table already exists with correct schema:
- `id` (String/UUID) - Primary key
- `video_id` (String) - Foreign key to videos
- `author_name` (String, nullable) - Display name
- `author_id` (String, nullable) - User ID (if authenticated)
- `timestamp_seconds` (Float) - Video timestamp
- `body` (Text) - Comment text
- `created_at` (DateTime) - Creation timestamp

## Display Name Persistence (Already Working)

Display name is already persisted in localStorage:
- Key: `remoDisplayName`
- Loaded on app mount
- Used automatically when posting comments
- Persists across sessions ✅

## Testing Instructions

### Prerequisites
1. Backend running on `http://127.0.0.1:8000`
2. Frontend running on `http://localhost:5177` (or configured port)

### Test Steps

1. **Start Backend:**
   ```bash
   cd backend
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Comment Persistence:**
   - Open browser to frontend URL
   - Set display name (if not already set)
   - Select a video (use API video from seeded data)
   - Add a comment at a specific timestamp
   - **Verify:** Comment appears immediately
   - **Check backend logs:** Should see `[BACKEND] POST /videos/{id}/comments - Creating comment...`
   - **Refresh page** (F5)
   - **Verify:** Comment still appears after refresh
   - **Check backend logs:** Should see `[BACKEND] GET /videos/{id}/comments - Returning X comments`

4. **Test Multiple Videos:**
   - Select Video A, add comment "Comment A"
   - Select Video B, add comment "Comment B"
   - Switch back to Video A
   - **Verify:** Only "Comment A" is visible (not Comment B)
   - Switch to Video B
   - **Verify:** Only "Comment B" is visible (not Comment A)

5. **Test Database Verification:**
   ```bash
   cd backend
   python -c "
   import sqlite3
   conn = sqlite3.connect('remo.db')
   cursor = conn.cursor()
   cursor.execute('SELECT COUNT(*) FROM comments')
   count = cursor.fetchone()[0]
   print(f'Total comments in DB: {count}')
   cursor.execute('SELECT video_id, author_name, body, timestamp_seconds FROM comments ORDER BY created_at DESC LIMIT 5')
   for row in cursor.fetchall():
       print(f'Video: {row[0]}, Author: {row[1]}, Comment: {row[2][:50]}..., Time: {row[3]}s')
   conn.close()
   "
   ```

6. **Test Browser Network Tab:**
   - Open DevTools → Network tab
   - Filter by "comments" or "XHR"
   - Add a comment
   - **Verify:** See `POST /videos/{id}/comments` request
   - Refresh page
   - **Verify:** See `GET /videos/{id}/comments` request
   - Check response: Should contain your comment

## Verification Checklist

- [x] Comments are saved to backend database
- [x] Comments are loaded from backend on page load
- [x] Comments are loaded when video is selected
- [x] Comments persist after page refresh
- [x] Comments persist across browser sessions
- [x] Comments are correctly associated with video_id
- [x] Comments include author_name (display name)
- [x] Comments include timestamp_seconds
- [x] Display name is persisted in localStorage
- [x] Backend logs show comment creation
- [x] Backend logs show comment retrieval
- [x] Database contains comment rows
- [x] Comments from different videos are isolated

## Backend Endpoints Used

### GET /videos/{video_id}/comments
- **Purpose:** Fetch all comments for a video
- **Response:** Array of CommentResponse objects
- **Ordering:** By timestamp_seconds, then created_at
- **Used by:** Frontend when video is selected

### POST /videos/{video_id}/comments
- **Purpose:** Create a new comment
- **Request Body:** 
  ```json
  {
    "author_name": "Display Name",
    "author_id": "user-id-or-null",
    "timestamp_seconds": 123.45,
    "body": "Comment text"
  }
  ```
- **Response:** CommentResponse object with generated ID
- **Used by:** Frontend when user posts a comment

## Frontend API Functions

### `getComments(videoId)`
- Located in `frontend/src/services/api.js`
- Calls `GET /videos/{videoId}/comments`
- Returns array of comment objects

### `postComment(videoId, comment)`
- Located in `frontend/src/services/api.js`
- Calls `POST /videos/{videoId}/comments`
- Returns created comment object

## Error Handling

- If backend is unavailable, comments fall back to localStorage
- If comment POST fails, comment is still shown in UI (optimistic update)
- Backend errors are logged to console
- Frontend gracefully handles missing comments

## Notes

- Comments for API videos are stored in backend database
- Comments for non-API videos (local/custom) are stored in localStorage
- Display name is always stored in localStorage (key: `remoDisplayName`)
- Comments are grouped by moments (timestamps) for display
- Backend comment IDs are UUIDs generated by database
- Frontend uses backend comment IDs to avoid duplicates

## Breaking Changes

**None** - This is a bug fix that adds functionality without breaking existing features.

## Future Improvements

- Add comment editing
- Add comment deletion
- Add comment reactions
- Add pagination for large comment lists
- Add real-time comment updates (WebSocket)
