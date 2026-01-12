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
