# ReMo Deployment Checklist

Quick checklist for deploying to Render (backend) + Vercel (frontend).

---

## ✅ Pre-Deployment Checklist

- [ ] Code is pushed to GitHub
- [ ] Backend code is in `backend/` directory
- [ ] Frontend code is in `frontend/` directory
- [ ] `backend/requirements.txt` exists with all dependencies
- [ ] `frontend/package.json` exists with all dependencies
- [ ] Render account created
- [ ] Vercel account created

---

## 🚀 Backend Deployment (Render)

### Step 1: Create Web Service
- [ ] Go to [Render Dashboard](https://dashboard.render.com/)
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub account (if not already)
- [ ] Select your ReMo repository

### Step 2: Configure Service
- [ ] **Name**: `remo-backend`
- [ ] **Region**: Choose closest (e.g., Oregon)
- [ ] **Branch**: `main`
- [ ] **Root Directory**: `backend` ⚠️
- [ ] **Runtime**: `Python 3`
- [ ] **Build Command**: (leave empty)
- [ ] **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 3: Environment Variables
- [ ] Add `ALLOWED_ORIGINS` = `http://localhost:5173,http://localhost:5177`
  - (We'll update with Vercel URL later)

### Step 4: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (2-5 min)
- [ ] Copy backend URL: `https://your-backend.onrender.com`
- [ ] Test: Visit `/health` endpoint → Should see `{"status":"healthy"}`

✅ **Backend deployed!** Save the URL.

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Create Project
- [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
- [ ] Click "Add New..." → "Project"
- [ ] Import your GitHub repository

### Step 2: Configure Project
- [ ] **Framework Preset**: `Vite` (auto-detected)
- [ ] **Root Directory**: `frontend` ⚠️ (click "Edit" to set)
- [ ] **Build Command**: `npm run build` (auto-detected)
- [ ] **Output Directory**: `dist` (auto-detected)

### Step 3: Environment Variables
- [ ] Add `VITE_API_BASE_URL` = `https://your-backend.onrender.com`
  - (Use the backend URL from Step 4 above)

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait for deployment (1-3 min)
- [ ] Copy frontend URL: `https://your-app.vercel.app`

✅ **Frontend deployed!** Save the URL.

---

## 🔄 Update Backend CORS

- [ ] Go back to Render dashboard
- [ ] Open your backend service
- [ ] Go to "Environment" tab
- [ ] Edit `ALLOWED_ORIGINS`
- [ ] Update value: `https://your-app.vercel.app,http://localhost:5173,http://localhost:5177`
- [ ] Save (auto-redeploys)

---

## ✅ Post-Deployment Verification

### Backend Tests
- [ ] `https://your-backend.onrender.com/health` → `{"status":"healthy"}`
- [ ] `https://your-backend.onrender.com/docs` → Swagger UI loads
- [ ] `https://your-backend.onrender.com/videos` → Returns video list

### Frontend Tests
- [ ] Frontend loads without errors
- [ ] Browser console shows no CORS errors
- [ ] Backend status shows "✓ Connected"
- [ ] Videos load and display
- [ ] Video playback works
- [ ] Comments work (if implemented)

---

## 🐛 Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| Backend build fails | Check `requirements.txt` has all dependencies |
| Frontend build fails | Check `package.json` has all dependencies |
| CORS errors | Update `ALLOWED_ORIGINS` with exact frontend URL |
| Frontend can't connect | Check `VITE_API_BASE_URL` matches backend URL |
| Backend sleeps (free tier) | Normal - first request after 15min takes 15-30s |

---

## 📝 Environment Variables Summary

**Render (Backend):**
```
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

**Vercel (Frontend):**
```
VITE_API_BASE_URL=https://your-backend.onrender.com
```

---

## 🎉 Done!

Your app should now be live at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-backend.onrender.com`

For detailed instructions, see `DEPLOYMENT_GUIDE.md`
