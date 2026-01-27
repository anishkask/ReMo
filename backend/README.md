# ReMo Backend

FastAPI backend for the ReMo application.

## Architecture

**Important:** The backend follows a single-file architecture. All code lives in `app/main.py` until at least 2 real endpoints exist. No models/, schemas/, services/, or layered architecture should be introduced yet. This keeps the codebase simple and avoids premature abstractions.

## Setup

1. Create a virtual environment:
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
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI) will be available at `http://localhost:8000/docs`

## Local Auth Setup

To enable Google OAuth authentication locally, you'll need to set up environment variables:

1. **Get Google OAuth Client ID:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create or select a project
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:5173`
   - Copy the Client ID

2. **Set environment variables:**
   
   **Option A: Create a `.env` file in the `backend` directory:**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   JWT_SECRET=your-random-secret-key-min-32-characters-long
   DATABASE_URL=./remo.db
   ALLOWED_ORIGINS=http://localhost:5173
   ```
   
   **Option B: Export in your shell (Unix/WSL):**
   ```bash
   export GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   export JWT_SECRET="your-random-secret-key-min-32-characters-long"
   export DATABASE_URL="./remo.db"
   export ALLOWED_ORIGINS="http://localhost:5173"
   ```
   
   **Option C: Set in PowerShell (Windows):**
   ```powershell
   $env:GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   $env:JWT_SECRET="your-random-secret-key-min-32-characters-long"
   $env:DATABASE_URL="./remo.db"
   $env:ALLOWED_ORIGINS="http://localhost:5173"
   ```

3. **Run the server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

**Note:** If `GOOGLE_CLIENT_ID` is not set, Google authentication will be disabled but the API will still run. The database will be automatically initialized on first startup.

## Local Auth Setup (Quick Start with venv)

For a clean local development setup with virtual environment:

1. **Create and activate virtual environment:**
   
   **On Windows:**
   ```powershell
   cd backend
   python -m venv venv
   venv\Scripts\activate
   ```
   
   **On Unix/WSL/Mac:**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   
   This installs:
   - `fastapi` - Web framework
   - `uvicorn` - ASGI server
   - `google-auth` - Google ID token verification
   - `PyJWT` - JWT token creation/verification
   - `pydantic` - Data validation
   - `requests` - HTTP library (used by google-auth)

3. **Set environment variables** (see step 2 above)

4. **Run the development server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. **Verify setup:**
   - API docs: `http://localhost:8000/docs`
   - Health check: `http://localhost:8000/health`
