# ReMo Deployment Guide - Render + Vercel

Complete step-by-step guide to deploy ReMo backend to Render and frontend to Vercel.

---

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] GitHub repository with your ReMo code pushed
- [ ] Render account (free tier works) - [Sign up here](https://render.com/)
- [ ] Vercel account (free tier works) - [Sign up here](https://vercel.com/)
- [ ] Backend code is in `backend/` directory
- [ ] Frontend code is in `frontend/` directory

---

## Part 1: Deploy Backend to Render

### Step 1: Create Render Account & Connect GitHub

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Sign up or log in (you can use GitHub to sign up)
3. Click **"New +"** button in the top right
4. Select **"Web Service"**

### Step 2: Connect Your Repository

1. Click **"Connect account"** if you haven't connected GitHub yet
2. Authorize Render to access your GitHub repositories
3. Select your ReMo repository from the list
4. Click **"Connect"**

### Step 3: Configure Backend Service

Fill in the service configuration:

**Basic Settings:**
- **Name**: `remo-backend` (or your preferred name)
- **Region**: Choose closest to your users (e.g., `Oregon (US West)`)
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend` ⚠️ **IMPORTANT**

**Build & Deploy:**
- **Runtime**: `Python 3`
- **Build Command**: Leave **EMPTY** (no build needed for Python)
- **Start Command**: 
  ```
  uvicorn app.main:app --host 0.0.0.0 --port $PORT
  ```
  ⚠️ **IMPORTANT**: Use `$PORT` (Render's environment variable)

**Instance Type:**
- Select **"Free"** tier (sufficient for demo)

### Step 4: Set Environment Variables

Before deploying, click **"Advanced"** → **"Add Environment Variable"**

Add this variable:
- **Key**: `ALLOWED_ORIGINS`
- **Value**: `http://localhost:5173,http://localhost:5177`
  - ⚠️ We'll update this with your frontend URL after deploying to Vercel

**Optional (for Google Auth):**
- **Key**: `GOOGLE_CLIENT_ID`
- **Value**: Your Google OAuth Client ID (if using Google sign-in)

### Step 5: Deploy Backend

1. Click **"Create Web Service"**
2. Wait for deployment (2-5 minutes)
3. Watch the build logs - you should see:
   ```
   Installing dependencies...
   Starting uvicorn...
   INFO:     Uvicorn running on http://0.0.0.0:XXXX
   ```
4. Once deployed, copy your service URL:
   - Example: `https://remo-backend.onrender.com`
   - ⚠️ **Save this URL** - you'll need it for frontend deployment

### Step 6: Verify Backend Deployment

1. Open your backend URL in a browser
2. Add `/health` to the URL: `https://your-backend.onrender.com/health`
3. Should see: `{"status":"healthy"}`
4. Add `/docs` to see Swagger UI: `https://your-backend.onrender.com/docs`

✅ **Backend is deployed!** Now move to frontend.

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account & Connect GitHub

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Sign up or log in (you can use GitHub to sign up)
3. Click **"Add New..."** button
4. Select **"Project"**

### Step 2: Import Your Repository

1. Find your ReMo repository in the list
2. Click **"Import"** next to your repository

### Step 3: Configure Frontend Project

Vercel should auto-detect Vite, but verify these settings:

**Project Settings:**
- **Framework Preset**: `Vite` (should auto-detect)
- **Root Directory**: `frontend` ⚠️ **IMPORTANT** - Click "Edit" and set to `frontend`
- **Build Command**: `npm run build` (should auto-detect)
- **Output Directory**: `dist` (should auto-detect)
- **Install Command**: `npm install` (should auto-detect)

**Environment Variables:**
Click **"Environment Variables"** and add:
- **Key**: `VITE_API_BASE_URL`
- **Value**: `https://your-backend.onrender.com`
  - ⚠️ Replace with your actual Render backend URL from Part 1, Step 5
- **Environment**: Select all (Production, Preview, Development)

**Optional (for Google Auth):**
- **Key**: `VITE_GOOGLE_CLIENT_ID`
- **Value**: Your Google OAuth Client ID (if using Google sign-in)

### Step 4: Deploy Frontend

1. Click **"Deploy"** button
2. Wait for deployment (1-3 minutes)
3. Watch the build logs - you should see:
   ```
   Installing dependencies...
   Building for production...
   Build completed
   ```
4. Once deployed, Vercel will show your deployment URL:
   - Example: `https://remo-demo.vercel.app` or `https://remo-demo-xyz.vercel.app`
   - ⚠️ **Save this URL** - you'll need it to update backend CORS

### Step 5: Update Backend CORS

Now that you have your frontend URL, update the backend CORS settings:

1. Go back to [Render Dashboard](https://dashboard.render.com/)
2. Click on your backend service (`remo-backend`)
3. Go to **"Environment"** tab
4. Find `ALLOWED_ORIGINS` variable
5. Click **"Edit"** and update the value:
   ```
   https://your-frontend.vercel.app,http://localhost:5173,http://localhost:5177
   ```
   ⚠️ Replace `your-frontend.vercel.app` with your actual Vercel URL
6. Click **"Save Changes"**
7. Render will automatically redeploy (watch the logs)

### Step 6: Verify Frontend Deployment

1. Open your frontend URL in a browser
2. Open browser DevTools (F12) → Console tab
3. Check for errors
4. Verify:
   - ✅ Backend status shows "✓ Connected"
   - ✅ Videos load from backend
   - ✅ You can select and play videos
   - ✅ Comments work (if implemented)

---

## Part 3: Post-Deployment Verification

### Test Checklist

**Backend Tests:**
- [ ] `https://your-backend.onrender.com/health` returns `{"status":"healthy"}`
- [ ] `https://your-backend.onrender.com/docs` shows Swagger UI
- [ ] `https://your-backend.onrender.com/videos` returns video list

**Frontend Tests:**
- [ ] Frontend loads without errors
- [ ] Backend connection status shows "Connected"
- [ ] Videos are displayed
- [ ] Video playback works
- [ ] Comments can be posted (if implemented)
- [ ] No CORS errors in browser console

**Integration Tests:**
- [ ] Frontend can fetch videos from backend
- [ ] Comments are saved and loaded correctly
- [ ] Display name persists
- [ ] Google sign-in works (if configured)

---

## Troubleshooting

### Issue: Backend Deployment Fails

**Symptoms:** Build logs show errors, deployment fails

**Solutions:**
1. **Check Python version**: Render should auto-detect Python 3.12
2. **Check requirements.txt**: Ensure all dependencies are listed
3. **Check start command**: Must use `$PORT` not a fixed port
4. **Check root directory**: Must be `backend` not root

**Common Errors:**
- `ModuleNotFoundError`: Add missing package to `requirements.txt`
- `Port already in use`: Use `$PORT` in start command
- `No module named 'app'`: Check root directory is `backend`

### Issue: Frontend Can't Connect to Backend

**Symptoms:** Frontend shows "Disconnected", CORS errors in console

**Solutions:**
1. **Check `VITE_API_BASE_URL`**: Must match your Render backend URL exactly
2. **Check `ALLOWED_ORIGINS`**: Must include your Vercel frontend URL
3. **Verify backend is running**: Visit `/health` endpoint
4. **Check for trailing slashes**: URLs should not end with `/`
5. **Redeploy backend**: After updating `ALLOWED_ORIGINS`, backend must redeploy

**Common CORS Errors:**
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```
→ Update `ALLOWED_ORIGINS` in Render with exact frontend URL

### Issue: Frontend Build Fails

**Symptoms:** Vercel build logs show errors

**Solutions:**
1. **Check Node.js version**: Vercel should auto-detect (Node 18+)
2. **Check root directory**: Must be `frontend`
3. **Check build command**: Should be `npm run build`
4. **Check output directory**: Should be `dist`
5. **Check for missing dependencies**: Review `package.json`

**Common Build Errors:**
- `Cannot find module`: Add missing dependency to `package.json`
- `Build failed`: Check Vite config and dependencies

### Issue: Environment Variables Not Working

**Symptoms:** Frontend uses default API URL, backend uses default CORS

**Solutions:**
1. **Frontend**: Environment variables must start with `VITE_` prefix
2. **Backend**: Check variable names match exactly (case-sensitive)
3. **Redeploy**: After adding/changing env vars, redeploy is required
4. **Check spelling**: Variable names must match exactly

### Issue: Backend Goes to Sleep (Free Tier)

**Symptoms:** First request after inactivity is slow (15-30 seconds)

**Solutions:**
- This is normal for Render free tier
- Backend sleeps after 15 minutes of inactivity
- First request wakes it up (takes ~15-30 seconds)
- Consider upgrading to paid tier for always-on service

---

## Environment Variables Reference

### Backend (Render)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `ALLOWED_ORIGINS` | ✅ Yes | `https://remo.vercel.app,http://localhost:5173` | Comma-separated frontend URLs |
| `GOOGLE_CLIENT_ID` | ⚠️ Optional | `123456789-abc...` | Google OAuth Client ID |
| `DATABASE_URL` | ⚠️ Optional | `sqlite:///./remo.db` | Database URL (defaults to SQLite) |

### Frontend (Vercel)

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | ✅ Yes | `https://remo-backend.onrender.com` | Backend API URL |
| `VITE_GOOGLE_CLIENT_ID` | ⚠️ Optional | `123456789-abc...` | Google OAuth Client ID |

---

## Updating Your Deployment

### Making Changes

1. **Push to GitHub**: Commit and push your changes
2. **Auto-deploy**: Both Render and Vercel will auto-detect changes
3. **Monitor logs**: Watch deployment logs for errors
4. **Test**: Verify changes work in production

### Manual Redeploy

**Render:**
1. Go to service dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

**Vercel:**
1. Go to project dashboard
2. Click **"Redeploy"** on latest deployment

---

## Cost Estimate (Free Tier)

**Render (Backend):**
- ✅ Free tier available
- ⚠️ Service sleeps after 15 min inactivity
- 💰 Paid tier: $7/month for always-on

**Vercel (Frontend):**
- ✅ Free tier available
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- 💰 Paid tier: $20/month for team features

**Total Monthly Cost: $0** (free tier) or **$7** (always-on backend)

---

## Next Steps After Deployment

1. **Set up custom domain** (optional):
   - Vercel: Add domain in project settings
   - Render: Add domain in service settings
   - Update `ALLOWED_ORIGINS` with new domain

2. **Enable Google OAuth** (optional):
   - Add authorized origins in Google Cloud Console
   - Add environment variables in both services

3. **Monitor performance**:
   - Check Render logs for backend errors
   - Check Vercel analytics for frontend performance

4. **Set up database** (if needed):
   - Render PostgreSQL (paid)
   - External database service
   - Update `DATABASE_URL` environment variable

---

## Quick Reference Commands

**Backend Start Command (Render):**
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Frontend Build Command (Vercel):**
```bash
npm run build
```

**Frontend Output Directory:**
```
dist
```

**Backend Root Directory:**
```
backend
```

**Frontend Root Directory:**
```
frontend
```

---

## Support & Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Vite Docs**: https://vite.dev/

---

**🎉 Congratulations! Your ReMo app should now be live!**

If you encounter any issues, check the Troubleshooting section above or review the deployment logs.
