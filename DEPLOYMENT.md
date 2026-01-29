# ReMo Deployment Guide - Demo v1

This guide walks you through deploying ReMo to production as a live demo.

## Prerequisites

- GitHub repository with ReMo code
- Accounts on:
  - **Vercel** (or Netlify) for frontend
  - **Render** (or Railway) for backend

---

## Step 1: Deploy Backend (Render)

### 1.1 Create New Web Service

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

## Render Backend Configuration

### Critical Settings

**⚠️ IMPORTANT**: Render defaults to Python 3.13.4, which causes `pydantic-core` to build from source (Rust/Cargo), leading to build failures due to read-only filesystem. The `runtime.txt` file forces Python 3.11.9, which has pre-built wheels for all dependencies.

#### Required Configuration

1. **Root Directory**: `backend`
   - This is the directory Render uses as the service root
   - Must contain `requirements.txt` and `runtime.txt`
   - All paths in build/start commands are relative to this directory

2. **Runtime**: `Python 3`
   - Render will automatically detect and use Python version from `backend/runtime.txt`
   - The `runtime.txt` file must contain exactly: `python-3.11.9`

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

### Verification Checklist

After deploying, verify that Render is using Python 3.11 and installing wheels correctly:

#### ✅ Check Python Version in Build Logs

1. Go to Render Dashboard → Your service → **Logs** tab
2. Look for the build log section
3. **Verify**: You should see one of these messages:
   - `Python 3.11.9` or `python3.11` in the build output
   - `Using Python version: 3.11.9` or similar
   - **NOT** `Python 3.13` or `python3.13`

#### ✅ Check pydantic-core Installation Method

In the build logs, search for `pydantic-core`:

1. **✅ CORRECT** - Installing from wheel:
   ```
   Collecting pydantic-core==2.14.1
   Downloading pydantic_core-2.14.1-cp311-*.whl
   Installing collected packages: pydantic-core
   Successfully installed pydantic-core-2.14.1
   ```
   - Look for `.whl` file extension
   - Should see "Downloading" not "Building"

2. **❌ INCORRECT** - Building from source (will fail):
   ```
   Collecting pydantic-core==2.14.1
   Building wheels for pydantic-core
   Building pydantic-core from source
   error: Read-only file system: '/usr/local/cargo/...'
   ```
   - If you see "Building wheels" or "Building from source", Python 3.11 is NOT being used
   - If you see Cargo/Rust errors, Python 3.13 is being used

#### ✅ Verify No Cargo/Rust Errors

The build logs should **NOT** contain:
- `cargo` commands
- `maturin` build output
- `error: Read-only file system` related to `/usr/local/cargo/`
- Any Rust compilation errors

#### ✅ Successful Build Indicators

A successful build should show:
- ✅ Python 3.11.9 detected and used
- ✅ `pydantic-core` downloaded as `.whl` file
- ✅ All packages install successfully
- ✅ Application starts without errors
- ✅ Health endpoint responds: `{"status":"healthy"}`

### Troubleshooting Python Version Issues

If Render is still using Python 3.13:

1. **Verify `backend/runtime.txt` exists**:
   ```bash
   cat backend/runtime.txt
   # Should output: python-3.11.9
   ```

2. **Check Root Directory setting**:
   - Render Dashboard → Service → Settings → **Root Directory** must be `backend`
   - Not empty, not `./backend`, just `backend`

3. **Clear build cache and redeploy**:
   - Settings → Clear build cache → Manual Deploy

4. **Check build logs for Python detection**:
   - Look for "Detected Python version" or similar messages
   - If it says 3.13, the `runtime.txt` is not being read correctly

---

## Step 2: Deploy Frontend (Vercel)

### 2.1 Create New Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
   - **Install Command**: `npm install` (should auto-detect)

### 2.2 Set Environment Variables

In the Vercel project settings, go to **Environment Variables** and add:

```
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

**Note**: Replace `https://your-backend-url.onrender.com` with your actual backend URL from Step 1.

### 2.3 Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Copy the deployment URL (e.g., `https://remo-demo.vercel.app`)

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
