# ReMo (Real-time Media Moments)

A web application that enables timestamped comments on videos. Comments appear live as the video plays, creating an interactive viewing experience similar to YouTube's live chat or VOD comments.

## Project Summary

**Problem**: Traditional video comments are static and disconnected from playback. Users can't easily see what others said at specific moments, and there's no way to experience comments "live" as the video plays.

**Solution**: ReMo provides timestamped comments that reveal progressively as the video plays. Comments are stored persistently in a database and synchronized across all viewers.

**Technical Interest**: 
- Client-side progressive reveal logic (comments appear when `currentTime >= timestamp_seconds`)
- Persistent storage with soft deletion
- Rate limiting to prevent abuse
- Optimistic UI updates with rollback on failure
- Careful dependency management to prevent infinite fetch loops

## Core Features

### Timestamped Comments
- Each comment is tied to a specific video timestamp (`timestamp_seconds`)
- Comments are ordered by timestamp, then by creation time
- Video timestamp displayed as `MM:SS` or `HH:MM:SS` format

### Live Comment Timeline Behavior
- **Progressive Reveal**: Comments appear when video playback reaches their timestamp
- **Persistent Visibility**: Once revealed, comments remain visible even if video is seeked backwards
- **Show All Toggle**: Option to view all comments (including unrevealed ones) with visual distinction
- **Auto-scroll**: Feed automatically scrolls to newest revealed comment (only if user is near bottom)
- **Jump to Latest**: Button appears when user scrolls up, allowing quick return to latest comments

### Persistent Storage
- **Production**: PostgreSQL database (Render Postgres)
- **Local Dev**: SQLite database (`backend/remo.db`)
- Comments persist across deploys, restarts, and users
- Soft deletion (`deleted_at` column) preserves data while hiding from UI

### Authentication
- Google OAuth via ID token verification
- Guest comments supported (no auth required)
- User identity stored in `author_id` and `author_name` fields
- Delete authorization: only comment author can delete their own comments

### Deployment Architecture
- **Frontend**: Vercel (static hosting)
- **Backend**: Render (Docker container)
- **Database**: Render Postgres (production) or SQLite (local)
- Environment variables configure API URLs and CORS origins

## How the Live Comment Timeline Works

### Step 1: Comment Fetching
Comments are fetched **once** when a video is selected:
- `GET /videos/{video_id}/comments` returns all comments ordered by `timestamp_seconds ASC, created_at ASC`
- Comments are stored in React state (`commentsByVideoId`)
- **No polling**: Comments are not refetched on every `currentTime` update

### Step 2: Progressive Reveal Logic
As the video plays, `currentTime` updates trigger reveal checks:
- `useEffect` watches `currentTime` in `LiveCommentsFeed` component
- When `currentTime` increases, comments with `timestamp_seconds <= currentTime` are added to `revealedCommentIds` Set
- This Set persists across seeks (comments stay revealed once shown)

### Step 3: Visibility Filtering
Comments are filtered client-side based on two modes:

**Default Mode** (toggle OFF):
- Show only comments where `timestamp_seconds <= currentTime` OR `comment.id in revealedCommentIds`
- Displays count: "X of Y comments"

**Show All Mode** (toggle ON):
- Show all comments regardless of timestamp
- Unrevealed comments (`timestamp_seconds > currentTime`) have:
  - Reduced opacity (50%)
  - "upcoming" label
- Displays count: "Y comments"

### Step 4: Auto-scroll Behavior
- Auto-scrolls to bottom when new comments are revealed
- Only if user is within 50px of bottom (prevents interrupting manual scrolling)
- If user scrolls up, auto-scroll pauses and "Jump to latest" button appears
- Clicking "Jump to latest" scrolls to bottom and resumes auto-scroll

### Why Comments Stay Visible After Appearing
Once a comment's timestamp is reached, its ID is added to `revealedCommentIds`. This Set is never cleared (except when switching videos). Even if the video is seeked backwards, revealed comments remain visible because they're in the Set. This matches the expected UX: once you've seen a comment, it stays visible.

## Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **State Management**: React hooks (`useState`, `useEffect`, `useRef`)
- **Styling**: CSS (no framework)
- **API Client**: Fetch API with centralized base URL handling
- **Build Tool**: Vite

### Backend
- **Framework**: FastAPI (Python 3.11)
- **ORM**: SQLAlchemy
- **Database Migrations**: Alembic
- **Rate Limiting**: In-memory (5 comments per 10 seconds per user)
- **Server**: Uvicorn (ASGI)

### Database
- **Production**: PostgreSQL (Render Postgres)
- **Local Dev**: SQLite (`backend/remo.db`)
- **Connection**: SQLAlchemy engine with `pool_pre_ping=True` for Postgres
- **Migrations**: Alembic (runs automatically on Docker container startup)

### Auth
- **Provider**: Google OAuth 2.0 (ID token verification)
- **Flow**: Frontend receives Google ID token → sends to backend → backend verifies token → returns access token
- **Storage**: Access token stored in `localStorage` (not secure, suitable for demo)

### Hosting
- **Frontend**: Vercel (static site hosting)
- **Backend**: Render (Docker container)
- **Database**: Render Postgres (managed PostgreSQL)

## System Architecture

### Request Flow

```
User Action (e.g., post comment)
  ↓
Frontend (React)
  ↓
API Client (api.js) → GET/POST/DELETE requests
  ↓
Backend (FastAPI)
  ↓
Rate Limiter (if POST) → Check limit
  ↓
Database (SQLAlchemy) → Query/Insert/Update
  ↓
PostgreSQL (production) or SQLite (local)
  ↓
Response → Frontend updates state optimistically
```

### Separation of Concerns

**Frontend**:
- `App.jsx`: Main app logic, video selection, comment fetching orchestration
- `LiveCommentsFeed.jsx`: Comment display, reveal logic, auto-scroll
- `services/api.js`: Centralized API client with base URL handling
- `utils/time.js`: Timestamp formatting utilities
- `utils/comments.js`: Comment grouping and localStorage utilities (legacy, not used for API videos)

**Backend**:
- `app/main.py`: FastAPI app, routes, request handling
- `app/models.py`: SQLAlchemy ORM models (`Video`, `Comment`)
- `app/db.py`: Database engine configuration, session management
- `app/rate_limit.py`: Rate limiting logic (in-memory)

## Local Development

### Frontend

```bash
cd frontend
npm install
npm run dev  # Runs on http://localhost:5177
```

**Required Environment Variables** (create `frontend/.env.local`):
```
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac/WSL
# or: venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Required Environment Variables** (create `backend/.env` or set in shell):
```
ALLOWED_ORIGINS=http://localhost:5177,http://localhost:5173
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
DATABASE_URL=sqlite:///./remo.db  # Optional: defaults to SQLite if not set
```

**Database Setup** (local):
- SQLite database (`backend/remo.db`) is created automatically on first run
- Tables are created via `Base.metadata.create_all()` on startup
- Migrations run automatically if `deleted_at` column is missing

## Deployment

### Frontend (Vercel)

1. Connect GitHub repository to Vercel
2. Set **Root Directory**: `frontend`
3. Set environment variables:
   - `VITE_API_BASE_URL`: `https://your-backend.onrender.com`
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth client ID
4. Deploy (auto-deploys on push to main branch)

### Backend (Render)

1. Create new **Docker Web Service** in Render
2. Connect GitHub repository
3. Set **Root Directory**: `backend`
4. Set **Environment**: `Docker`
5. Set environment variables:
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app,http://localhost:5177`
   - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
   - `DATABASE_URL`: Render Postgres internal database URL (auto-provided)
6. Deploy

**Database Setup** (production):
- Create Render Postgres database
- Set `DATABASE_URL` environment variable (Render provides internal URL)
- Migrations run automatically on container startup via Dockerfile CMD: `alembic upgrade head`

See `DEPLOYMENT.md` for detailed step-by-step instructions.

## Design Decisions & Tradeoffs

### Why Client-Side Filtering Instead of Server-Side?

Comments are fetched once per video, then filtered client-side based on `currentTime`. This avoids:
- **Polling overhead**: No repeated requests as video plays
- **Server load**: Single fetch per video selection
- **Latency**: Instant reveal (no network round-trip)

**Tradeoff**: All comments are loaded upfront. For videos with thousands of comments, pagination would be needed.

### Why No WebSockets?

Current implementation uses HTTP requests only. WebSockets would enable real-time comment updates (new comments appear instantly for all viewers), but adds complexity:
- WebSocket server infrastructure
- Connection management
- Message queuing
- Reconnection logic

**Current approach**: Comments are fetched after POST/DELETE operations, providing eventual consistency with simpler architecture.

### Why In-Memory Rate Limiting?

Rate limiting uses an in-memory dictionary (`_rate_limit_store`). This is simple but has limitations:
- **Not distributed**: Each backend instance has its own limit counter
- **Lost on restart**: Limits reset when server restarts
- **No persistence**: No historical tracking

**Production alternative**: Redis or similar distributed cache would provide shared rate limiting across instances.

### Why Soft Delete Instead of Hard Delete?

Comments use `deleted_at` timestamp instead of physical deletion:
- **Data preservation**: Comments can be restored if needed
- **Audit trail**: Deleted comments remain in database for moderation
- **Cascade safety**: Foreign key constraints remain intact

**Tradeoff**: Database grows over time. Periodic cleanup job would be needed for production.

### Known Limitations

1. **No Real-Time Updates**: New comments from other users don't appear until page refresh or new comment POST
2. **No Pagination**: All comments are loaded at once (fine for videos with <1000 comments)
3. **Rate Limiting**: In-memory only (not shared across multiple backend instances)
4. **Auth Token Storage**: Access tokens stored in `localStorage` (not secure for production)
5. **No Comment Editing**: Comments can only be deleted, not edited
6. **No Moderation**: No admin interface or content moderation tools

## Future Improvements

### Real-Time WebSockets
- WebSocket connection for live comment updates
- New comments appear instantly for all viewers
- Typing indicators, live reaction counts

### Comment Reactions
- Like/dislike buttons on comments
- Reaction counts displayed in UI
- Aggregate reactions in database

### Threaded Replies
- Reply-to-comment functionality
- Nested comment threads
- Thread collapse/expand UI

### Moderation
- Admin interface for comment moderation
- Flag/report functionality
- Automated content filtering

### Performance Optimizations
- Comment pagination (load comments in chunks)
- Virtual scrolling for large comment lists
- Debounced reveal checks (reduce `useEffect` frequency)

### Enhanced Features
- Comment search/filter
- User profiles and comment history
- Notification system for replies
- Export comments as transcript

---

## License

[Add your license here]

## Contributing

[Add contribution guidelines if applicable]
