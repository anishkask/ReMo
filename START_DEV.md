# Quick Start Guide - Running Frontend and Backend

## Prerequisites
- Backend virtual environment exists (`backend/venv`)
- Frontend dependencies installed (`frontend/node_modules`)

## Running Both Services

### Option 1: Using Startup Scripts (Easiest)

**Terminal 1 - Backend:**
```powershell
cd backend
.\start.bat
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Option 2: Manual Commands

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Option 3: WSL/Linux Commands

**Terminal 1 - Backend:**
```bash
cd /mnt/c/Users/anish/OneDrive/Documents/PersonalProjects/ReMo/backend
source venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd /mnt/c/Users/anish/OneDrive/Documents/PersonalProjects/ReMo/frontend
npm run dev
```

## Expected Results

- **Backend**: Running on http://127.0.0.1:8000
  - Health check: http://127.0.0.1:8000/health
  - API docs: http://127.0.0.1:8000/docs

- **Frontend**: Running on http://localhost:5177 (strict port - will fail if port is in use)
  - Should automatically open in browser
  - Will show version marker in header

## Troubleshooting

### Port 5177 Already in Use
The frontend now uses strict port enforcement. If you see:
```
Port 5177 is in use, trying another one...
Error: Port 5177 is in use
```

**Solution**: Find and kill the process using port 5177:
```powershell
# Find process using port 5177
netstat -ano | findstr :5177
# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Backend Port 8000 Already in Use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000
# Kill the process
taskkill /PID <PID> /F
```

### Backend Not Starting
- Make sure virtual environment is activated
- Check that all dependencies are installed: `pip install -r requirements.txt`

### Frontend Not Connecting to Backend
- Verify backend is running on port 8000
- Check that `frontend/.env.local` exists with: `VITE_API_BASE_URL=http://127.0.0.1:8000`
- Check browser console for CORS errors (should be fixed now)

## Environment Variables

Create `frontend/.env.local` for local development:
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

This file is gitignored and won't be committed.
