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
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3` (will use Python 3.11.9 from `runtime.txt`)
   - **Build Command**: `python -m pip install --upgrade pip setuptools wheel && pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 1.2 Set Environment Variables

In the Render dashboard, go to **Environment** section and add:

```
ALLOWED_ORIGINS=https://your-frontend-url.vercel.app,http://localhost:5173
```

**Note**: Replace `https://your-frontend-url.vercel.app` with your actual frontend URL (you'll get this after deploying the frontend). For now, you can add it later or use a placeholder and update it.

### 1.3 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment to complete
3. Copy the service URL (e.g., `https://remo-backend.onrender.com`)

---

## Render Backend

### Configuration Details

- **Root Directory**: `backend`
  - Render builds from the `backend/` directory, which contains `requirements.txt` and `runtime.txt`
  - The `runtime.txt` file specifies Python 3.11.9 to avoid compatibility issues with newer Python versions

- **Build Command**: 
  ```bash
  python -m pip install --upgrade pip setuptools wheel && pip install -r requirements.txt
  ```
  - Upgrades pip, setuptools, and wheel before installing dependencies
  - Ensures proper wheel installation for packages like `pydantic-core` (avoids building from source)

- **Start Command**: 
  ```bash
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
  - Starts the FastAPI application using uvicorn
  - Binds to `0.0.0.0` to accept external connections
  - Uses `$PORT` environment variable provided by Render

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
