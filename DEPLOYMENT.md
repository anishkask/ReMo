# ReMo Deployment Guide - Demo v1

This guide walks you through deploying ReMo to production as a live demo.

## Prerequisites

- GitHub repository with ReMo code
- Accounts on:
  - **Vercel** (or Netlify) for frontend
  - **Render** (or Railway) for backend

---

## Step 1: Deploy Backend (Render)

### Option A: Docker Deployment (Recommended)

**Why Docker?** Docker gives full control over Python version, avoiding Render's Python version detection issues. This is the most reliable way to ensure Python 3.11 and prevent pydantic-core source builds.

#### 1.1 Create New Docker Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `remo-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Environment**: `Docker` ⚠️ **Select Docker, not Python**
   - **Dockerfile Path**: `backend/Dockerfile` (or leave empty if root directory is `backend`)
   - **Start Command**: (leave empty - handled by Dockerfile CMD)

#### 1.2 Set Environment Variables

In the Render dashboard, go to **Environment** section and add:

```
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:5173,http://localhost:5177
```

**Note**: Replace `https://your-frontend-url.vercel.app` with your actual frontend URL.

#### 1.3 Deploy

1. Click **"Create Web Service"**
2. Render will build the Docker image using `backend/Dockerfile`
3. The Dockerfile uses `python:3.11-slim` base image, ensuring Python 3.11
4. Wait for deployment to complete
5. Copy the service URL (e.g., `https://remo-backend.onrender.com`)

---

### Option B: Python Runtime Deployment (Legacy)

**Note**: If `runtime.txt` detection fails, use Docker deployment (Option A) instead.

#### 1.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `remo-backend` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend` ⚠️ **CRITICAL**: Must be exactly `backend` (not empty, not `./backend`)
     - This tells Render to use `backend/` as the service root
     - Render will look for `runtime.txt` in this directory to determine Python version
   - **Runtime**: `Python 3` (Render will use Python 3.11.9 from `backend/runtime.txt`)
   - **Build Command**: `python -m pip install --upgrade pip setuptools wheel && pip install -r requirements.txt`
     - This ensures `pydantic-core` installs from wheels (avoids Rust/Cargo build failures)
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 1.2 Set Environment Variables

In the Render dashboard, go to **Environment** section and add:

```
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:5173,http://localhost:5177
```

**Note**: Replace `https://your-frontend-url.vercel.app` with your actual frontend URL (you'll get this after deploying the frontend). For now, you can add it later or use a placeholder and update it.

### 1.3 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment to complete
3. Copy the service URL (e.g., `https://remo-backend.onrender.com`)

---

## Render Backend (Docker) - Recommended

### Why Docker?

Docker deployment provides **guaranteed Python 3.11** without relying on Render's Python version detection. This completely avoids:
- Python 3.13.4 default causing pydantic-core source builds
- `runtime.txt` detection failures
- Rust/Cargo build errors on read-only filesystem

### Docker Configuration

#### File Structure

Ensure your `backend/` directory contains:
```
backend/
├── Dockerfile           # Docker configuration (uses python:3.11-slim)
├── .dockerignore       # Files to exclude from Docker build
├── app/
│   └── main.py         # FastAPI application
└── requirements.txt    # Python dependencies
```

#### Dockerfile Details

The `backend/Dockerfile`:
- Uses `python:3.11-slim` base image (guarantees Python 3.11)
- Installs dependencies with pip upgrade (ensures wheel installation)
- Exposes port 8000
- Uses `$PORT` environment variable (Render sets this automatically)
- CMD runs: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`

#### Render Service Settings

- **Service Type**: `Docker` (not Python)
- **Root Directory**: `backend`
- **Dockerfile Path**: `backend/Dockerfile` (or empty if root is `backend`)
- **Start Command**: (leave empty - Dockerfile CMD handles this)

#### Build Process

1. Render clones your repository
2. Navigates to `backend/` directory (root directory)
3. Builds Docker image using `Dockerfile`
4. Dockerfile uses `python:3.11-slim` → Python 3.11 guaranteed
5. Installs dependencies → `pydantic-core` installs from `.whl` wheels
6. Starts container → FastAPI app runs on `$PORT`

#### Verification

After deployment, check build logs:
- ✅ Should see: `FROM python:3.11-slim`
- ✅ Should see: `Downloading pydantic_core-2.14.1-cp311-*.whl`
- ✅ Should NOT see: `python3.13`, `maturin`, `cargo`, or source builds
- ✅ Build completes successfully
- ✅ Health endpoint responds: `{"status":"healthy"}`

---

## Render Backend Configuration (Python Runtime - Legacy)

### Critical Settings

**⚠️ IMPORTANT**: Render defaults to Python 3.13.4, which causes `pydantic-core` to build from source (Rust/Cargo), leading to build failures due to read-only filesystem. The `runtime.txt` file at the **repo root** forces Python 3.11.9, which has pre-built wheels for all dependencies.

#### Required Configuration

1. **Root Directory**: `backend`
   - This is the directory Render uses as the service root
   - Must contain `requirements.txt`
   - All paths in build/start commands are relative to this directory

2. **Runtime**: `Python 3`
   - **Render reads `runtime.txt` from the repository root** (same level as `backend/` and `frontend/`)
   - The repo root `runtime.txt` file must contain exactly: `python-3.11.9`
   - This ensures Render uses Python 3.11.9 instead of the default Python 3.13.4
   - Note: `backend/runtime.txt` may also exist, but Render prioritizes the repo root version

3. **Build Command**:
   ```bash
   python -m pip install --upgrade pip setuptools wheel && pip install -r requirements.txt
   ```
   - **Why this command**: Upgrades pip, setuptools, and wheel to latest versions before installing dependencies
   - Ensures `pydantic-core` installs from pre-built wheels (`.whl` files) instead of building from source
   - Prevents Rust/Cargo build failures on Render's read-only filesystem

4. **Start Command**:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
   - Starts the FastAPI application using uvicorn
   - Binds to `0.0.0.0` to accept external connections
   - Uses `$PORT` environment variable provided by Render (required)

### File Structure

Ensure your `backend/` directory contains:
```
backend/
├── app/
│   └── main.py          # FastAPI application
├── requirements.txt     # Python dependencies
└── runtime.txt          # Python version specification (python-3.11.9)
```

### Clearing Build Cache & Redeploying

If you encounter build issues or need to force a fresh build:

1. **Via Render Dashboard**:
   - Go to your service → **Settings** → **Clear build cache**
   - Click **"Clear build cache"**
   - Trigger a new deploy (push to GitHub or click **"Manual Deploy"**)

2. **Via Manual Deploy**:
   - Go to your service → **Manual Deploy** → **"Deploy latest commit"**
   - This forces a fresh build without clearing cache first

3. **After updating `runtime.txt`**:
   - Push changes to GitHub
   - Render will auto-detect and redeploy
   - If Python version doesn't change, clear build cache and redeploy

### Quick Verification Checklist

After deploying, check Render build logs to confirm Python 3.11.9 is being used:

#### ✅ Look for These Lines (Python 3.11.9):

In Render Dashboard → Your service → **Logs** → Build section, you should see:
- `Python 3.11.9` or `python3.11` 
- `Using Python version: 3.11.9`
- `Downloading pydantic_core-2.14.1-cp311-*.whl` (note the `.whl` extension)
- `Successfully installed pydantic-core-2.14.1`

#### ❌ These Lines Should NOT Appear:

If you see any of these, Python 3.13 is being used and the build will fail:
- `python3.13` or `Python 3.13.4`
- `Building wheels for pydantic-core`
- `Building pydantic-core from source`
- `pydantic_core-*.tar.gz` (tar.gz means source build)
- `maturin` (Rust build tool)
- `cargo` (Rust package manager)
- `error: Read-only file system: '/usr/local/cargo/...'`

#### Verification Steps:

1. Go to Render Dashboard → Your service → **Logs**
2. Scroll to the build section (look for pip install output)
3. Search for "Python" - should show `3.11.9` not `3.13`
4. Search for "pydantic-core" - should show `.whl` download, not source build
5. If you see `python3.13`, `maturin`, `cargo`, or `tar.gz` for pydantic-core, clear build cache and redeploy

### Troubleshooting Python Version Issues

If Render is still using Python 3.13:

1. **Verify repo root `runtime.txt` exists**:
   ```bash
   cat runtime.txt
   # Should output: python-3.11.9
   ```
   - This file must be at the repository root (same level as `backend/` and `frontend/`)
   - Render reads from repo root, not from `backend/runtime.txt`

2. **Check Root Directory setting**:
   - Render Dashboard → Service → Settings → **Root Directory** must be `backend`
   - Not empty, not `./backend`, just `backend`

3. **Clear build cache and redeploy**:
   - Settings → Clear build cache → Manual Deploy

4. **Check build logs for Python detection**:
   - Look for "Detected Python version" or similar messages
   - If it says 3.13, the repo root `runtime.txt` is not being read correctly

---

## Step 2: Deploy Frontend (Vercel)

### 2.1 Create New Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` ⚠️ **CRITICAL**: Must be exactly `frontend`
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
   - **Install Command**: `npm install` (should auto-detect)

### 2.2 Set Environment Variables

In the Vercel project settings, go to **Environment Variables** and add:

**Required Variables:**
```
VITE_API_BASE_URL=https://your-backend-url.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**Optional (for build version display):**
```
VITE_GIT_COMMIT=auto (Vercel sets this automatically)
VITE_BUILD_TIME=auto (Vercel sets this automatically)
```

**Note**: 
- Replace `https://your-backend-url.onrender.com` with your actual backend URL from Step 1
- Replace `your-google-client-id.apps.googleusercontent.com` with your Google OAuth Client ID
- Vercel automatically sets `VITE_GIT_COMMIT` and `VITE_BUILD_TIME` during builds

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Copy the deployment URL (e.g., `https://remo-nine.vercel.app` or `https://remo-demo.vercel.app`)
4. **Verify**: Check the header for build version marker (commit hash or build date)

---

## Deployment Checklist & Configuration

### Vercel Configuration Checklist

#### Project Settings
- [ ] **Root Directory**: Set to `frontend` (not empty, not `./frontend`)
- [ ] **Framework Preset**: Vite (auto-detected)
- [ ] **Build Command**: `npm run build`
- [ ] **Output Directory**: `dist`
- [ ] **Install Command**: `npm install`

#### Environment Variables (Vercel)
- [ ] `VITE_API_BASE_URL` = `https://remo-backend.onrender.com` (your Render backend URL)
- [ ] `VITE_GOOGLE_CLIENT_ID` = `your-client-id.apps.googleusercontent.com`
- [ ] Verify variables are set for **Production** environment (and Preview if needed)

#### Verify Deployment
- [ ] Check build logs show successful build
- [ ] Visit deployed URL and check browser console for errors
- [ ] Verify build version marker appears in header (shows commit hash or build date)
- [ ] Test API connection (backend status should show "Connected")

### Render Configuration Checklist

#### Service Settings (Docker Recommended)
- [ ] **Service Type**: `Docker` (not Python)
- [ ] **Root Directory**: `backend`
- [ ] **Dockerfile Path**: `backend/Dockerfile` (or empty if root is `backend`)
- [ ] **Start Command**: (leave empty - Dockerfile CMD handles it)

#### Environment Variables (Render)
- [ ] `ALLOWED_ORIGINS` = `https://remo-nine.vercel.app,http://localhost:5177`
  - Include ALL Vercel production domains (comma-separated, no spaces)
  - Include localhost:5177 for local development
- [ ] `GOOGLE_CLIENT_ID` = `your-client-id.apps.googleusercontent.com` (same as Vercel)

#### Verify Deployment
- [ ] Check build logs show `FROM python:3.11-slim`
- [ ] Check build logs show `pydantic-core` installing from `.whl` (not source)
- [ ] Visit `https://your-backend.onrender.com/health` → should return `{"status":"healthy"}`
- [ ] Test CORS: Frontend should connect without CORS errors

### Google Cloud Console Configuration

#### OAuth 2.0 Client ID Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Find your OAuth 2.0 Client ID (type: "Web application")
4. Click **Edit** (pencil icon)

#### Authorized JavaScript Origins

Add **EXACT** origins (no trailing slashes, include `https://`):

**Production:**
- `https://remo-nine.vercel.app` (or your actual Vercel domain)
- Add any other Vercel production domains

**Development (optional):**
- `http://localhost:5177` (for local dev)

**Example:**
```
https://remo-nine.vercel.app
http://localhost:5177
```

#### Authorized Redirect URIs

For Google Identity Services (One Tap), you typically don't need redirect URIs, but if you add them:
- `https://remo-nine.vercel.app` (your Vercel domain)

#### Save and Wait
- [ ] Click **SAVE**
- [ ] Wait 1-2 minutes for changes to propagate
- [ ] Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### Common Failure Modes & Solutions

#### ❌ Wrong Repository Connected
**Symptoms**: Vercel/Render deploying old code or wrong project

**Solution**:
- Vercel: Settings → Git → Verify correct repository and branch
- Render: Settings → Repository → Verify correct repository and branch

#### ❌ Wrong Root Directory
**Symptoms**: Build fails, "Cannot find package.json" or "Cannot find requirements.txt"

**Solution**:
- Vercel: Settings → General → Root Directory = `frontend`
- Render: Settings → Root Directory = `backend`

#### ❌ Old Commit Deployed
**Symptoms**: Changes not appearing, build version shows old commit hash

**Solution**:
- Check Vercel/Render → Deployments → Verify latest commit is deployed
- Trigger manual redeploy: Vercel → Deployments → Redeploy
- Render → Manual Deploy → Deploy latest commit

#### ❌ Missing Environment Variables
**Symptoms**: API calls fail, Google OAuth fails, "undefined" in console

**Solution**:
- Vercel: Settings → Environment Variables → Verify all `VITE_*` variables set
- Render: Environment → Verify `ALLOWED_ORIGINS` and `GOOGLE_CLIENT_ID` set
- **Important**: Variables must be set for correct environment (Production/Preview)

#### ❌ CORS Errors (OPTIONS 400)
**Symptoms**: Browser console shows CORS errors, preflight requests fail

**Solution**:
- Verify `ALLOWED_ORIGINS` in Render includes exact Vercel domain (with `https://`)
- Check Render logs for CORS origin logs
- Ensure FastAPI CORSMiddleware is configured (already done in code)
- Verify no trailing slashes in origins

#### ❌ Google OAuth "Error 400: origin_mismatch"
**Symptoms**: Google Sign-In button doesn't appear or shows 403 error

**Solution**:
- Go to Google Cloud Console → APIs & Services → Credentials
- Find your OAuth 2.0 Client ID
- Under "Authorized JavaScript origins", add EXACT Vercel domain:
  - `https://remo-nine.vercel.app` (no trailing slash)
- Save and wait 1-2 minutes
- Hard refresh browser
- Check browser console for exact origin being used

#### ❌ Build Version Not Showing
**Symptoms**: No version marker in header, can't verify latest deploy

**Solution**:
- Vercel automatically sets `VITE_GIT_COMMIT` during builds
- Check Vercel build logs for commit hash
- Verify version marker component is rendering (check React DevTools)
- If still not showing, check browser console for errors

---

## Step 3: Update CORS in Backend

After you have your frontend URL:

1. Go back to Render dashboard
2. Navigate to your backend service
3. Go to **Environment** section
4. Update `ALLOWED_ORIGINS` to include your frontend URL:
   ```
   ALLOWED_ORIGINS=https://remo-demo.vercel.app,http://localhost:5173
   ```
5. Save and redeploy (Render will auto-redeploy)

---

## Step 4: Verify Deployment

### 4.1 Test Backend

1. Visit `https://your-backend-url.onrender.com/health`
2. Should return: `{"status":"healthy"}`

### 4.2 Test Frontend

1. Visit your frontend URL
2. Check browser console for errors
3. Verify:
   - Backend status shows "Connected"
   - Video selection works
   - Videos play correctly
   - Moments/comments appear during playback

---

## Alternative: Deploy to Railway (Backend)

If you prefer Railway for backend:

1. Go to [Railway Dashboard](https://railway.app/)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Add a new service → **"Empty Service"**
5. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variable: `ALLOWED_ORIGINS`
7. Deploy

---

## Alternative: Deploy to Netlify (Frontend)

If you prefer Netlify for frontend:

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub repository
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Add environment variable: `VITE_API_BASE_URL`
6. Deploy

---

## Troubleshooting

### CORS Errors

- Ensure `ALLOWED_ORIGINS` includes your exact frontend URL (with `https://`)
- Check that there are no trailing slashes
- Verify backend has been redeployed after updating environment variables

### API Connection Errors

- Verify `VITE_API_BASE_URL` is set correctly in frontend
- Check that backend is running (visit `/health` endpoint)
- Ensure backend URL is accessible (not blocked by firewall)

### Build Errors

- Ensure all dependencies are in `package.json` (frontend) or `requirements.txt` (backend)
- Check that Node.js/Python versions are compatible
- Review build logs in deployment platform

---

## Updating After Deployment

To update the deployed app:

1. Push changes to your GitHub repository
2. Vercel/Render will automatically detect changes and redeploy
3. No manual intervention needed (unless environment variables change)

---

## Notes

- This is **Demo v1** - the app is actively being iterated upon
- Backend uses SQLite for persistence (stored in `remo.db` file)
- **SQLite on Render Free Tier**: SQLite database files are stored on the filesystem, which is ephemeral on Render's free tier. This means:
  - Data persists during the instance lifetime
  - Data resets when the service restarts or redeploys
  - For production with persistent data, upgrade to Render's paid tier with persistent disk, or migrate to Postgres
- Google authentication is supported
- Videos are loaded from public URLs (no video hosting needed)

### Database Upgrade Path

To migrate from SQLite to Postgres for persistent storage:
1. Add `psycopg2` or `asyncpg` to `requirements.txt`
2. Update `db.py` to use Postgres connection string from `DATABASE_URL`
3. Ensure `DATABASE_URL` is set in Render environment variables
4. Database schema remains compatible (SQLite and Postgres use similar SQL)
