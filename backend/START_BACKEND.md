# How to Start the Backend Server

## Quick Start (Windows PowerShell)

1. Open PowerShell or Command Prompt
2. Navigate to backend folder:
   ```powershell
   cd C:\Users\anish\OneDrive\Documents\PersonalProjects\ReMo\backend
   ```

3. Activate virtual environment:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   If you get an execution policy error, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
   Then try activating again.

4. Install dependencies (if needed):
   ```powershell
   pip install -r requirements.txt
   ```

5. Start the server:
   ```powershell
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

6. You should see:
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
   INFO:     Started reloader process
   INFO:     Started server process
   INFO:     Waiting for application startup.
   INFO:     Application startup complete.
   ```

## Verify It's Working

1. Open browser: http://127.0.0.1:8000/health
   - Should show: `{"status":"healthy"}`

2. Open API docs: http://127.0.0.1:8000/docs
   - Should show Swagger UI

## Troubleshooting

- **"Module not found"**: Run `pip install -r requirements.txt`
- **"Port 8000 already in use"**: Kill the process using port 8000 or use a different port
- **"Execution policy"**: Run the Set-ExecutionPolicy command above
