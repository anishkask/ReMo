#!/bin/bash
# Start script for ReMo backend

cd "$(dirname "$0")"

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d "venv/Scripts" ]; then
    source venv/Scripts/activate
fi

# Install/update dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start the server
echo "Starting backend server on http://127.0.0.1:8000"
echo "API docs available at http://127.0.0.1:8000/docs"
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
