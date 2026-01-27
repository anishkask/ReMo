# ReMo Backend

FastAPI backend for the ReMo application.

## Architecture

**Important:** The backend follows a single-file architecture. All code lives in `app/main.py` until at least 2 real endpoints exist. No models/, schemas/, services/, or layered architecture should be introduced yet. This keeps the codebase simple and avoids premature abstractions.

## Quick Start

### Option 1: Use Startup Script (Recommended)

**Windows:**
```bash
cd backend
start.bat
```

**Linux/Mac/WSL:**
```bash
cd backend
chmod +x start.sh
./start.sh
```

### Option 2: Manual Setup

1. Create a virtual environment (if not exists):
```bash
python -m venv venv
source venv/bin/activate  # On WSL/Unix
# or: venv\Scripts\activate  # On Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the development server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Verify Backend is Running

1. Open browser: `http://127.0.0.1:8000/health`
   - Should return: `{"status":"healthy"}`

2. Open API docs: `http://127.0.0.1:8000/docs`
   - Should show Swagger UI with all endpoints

## Troubleshooting

- **Port 8000 already in use**: Kill the process or change port
- **Module not found errors**: Run `pip install -r requirements.txt`
- **Connection refused**: Make sure backend is running and accessible at `http://127.0.0.1:8000`
