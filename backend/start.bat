@echo off
REM Start script for ReMo backend (Windows)

cd /d "%~dp0"

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Start the server
echo Starting backend server on http://127.0.0.1:8000
echo API docs available at http://127.0.0.1:8000/docs
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
