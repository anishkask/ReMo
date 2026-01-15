# ReMo – Project Context & Development Guidelines

## Project Overview
ReMo is a full-stack web application that enables real-time interaction with media moments.
The goal is to let users react to, revisit, and engage with live or recorded moments
(e.g., timestamps, reactions, short comments) in a clean, demo-ready product.

This project is being built as a **portfolio-grade application** with production-quality
structure, clean commits, and a polished MVP suitable for recruiter demos.

---

## High-Level Goals
- Build a working **full-stack MVP** (frontend + backend).
- Prioritize **clarity, correctness, and demoability** over feature bloat.
- Keep all changes incremental and runnable at every stage.
- Avoid over-engineering or premature abstractions.

---

## Tech Stack (Current)
- Frontend: React (Vite)
- Backend: FastAPI (Python)
- Dev environment: WSL (Ubuntu) + VS Code / Cursor
- Backend port: 8000
- Frontend port: 5173

---

## Architecture Constraint (IMPORTANT)
- **Do NOT introduce models/, schemas/, services/, or layered architecture yet.**
- The backend must stay **single-file (`main.py`)** until at least 2 real endpoints exist.
- No abstractions unless duplication appears.
- If unsure, ask before restructuring.

---

## Repository Structure (Authoritative)

```
ReMo/
├── backend/                 # FastAPI backend application
│   ├── app/                 # Main application package
│   │   ├── __init__.py
│   │   └── main.py          # FastAPI app - ALL backend code here (single-file)
│   ├── requirements.txt     # Python dependencies
│   └── README.md            # Backend-specific docs
│
├── frontend/                # React (Vite) frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client services
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main App component
│   │   └── main.jsx         # Entry point
│   ├── public/              # Static assets
│   ├── package.json         # Node dependencies
│   ├── vite.config.js       # Vite configuration
│   └── README.md            # Frontend-specific docs
│
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## Development Guidelines

### Architecture Philosophy
- **Start simple, refactor when needed** - Keep backend in single file until duplication appears
- **No premature abstractions** - Only split code when you have at least 2 real endpoints
- **Incremental growth** - Add structure only when it solves a real problem

### Code Quality
- Write clean, readable code with clear naming
- Add comments for non-obvious logic
- Keep functions focused and single-purpose
- Follow language-specific style guides (PEP 8 for Python, ESLint for JS/TS)

### Git Workflow
- Make small, incremental commits with clear messages
- Commit working code at each stage
- Use descriptive commit messages (e.g., "Add user authentication endpoint")

### Testing Strategy
- Write tests for critical functionality
- Ensure the app runs without errors at each commit
- Test both frontend and backend integration

### API Design
- RESTful API design principles
- Clear endpoint naming
- Consistent response formats
- Proper error handling

---

## Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On WSL/Unix
# or: venv\Scripts\activate  # On Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Runs on port 5173
```

---

---

## Live Demo

ReMo is currently deployed as **Demo v1** and is actively being iterated upon.

**Note**: This is an evolving demo. Features and UI may change as development continues.

### Demo Links
- Frontend: [Coming soon - will be added after deployment]
- Backend API: [Coming soon - will be added after deployment]

---

## Deployment

### Environment Variables

**Frontend** (set in Vercel/Netlify):
- `VITE_API_BASE_URL`: Your deployed backend URL (e.g., `https://remo-backend.onrender.com`)

**Backend** (set in Render/Railway):
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g., `https://remo-demo.vercel.app,http://localhost:5173`)

### Quick Deployment Guide

1. **Deploy Backend** (Render or Railway):
   - Connect your repository
   - Set build command: (none needed)
   - Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variable: `ALLOWED_ORIGINS` with your frontend URL(s)
   - Deploy

2. **Deploy Frontend** (Vercel or Netlify):
   - Connect your repository
   - Set root directory: `frontend`
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add environment variable: `VITE_API_BASE_URL` with your backend URL
   - Deploy

See `DEPLOYMENT.md` for detailed step-by-step instructions.

---

## Next Steps
- [x] Set up backend FastAPI structure (single-file approach)
- [x] Set up frontend React structure
- [x] Configure CORS for frontend-backend communication
- [x] Deploy Demo v1
- [ ] Continue iterating on features and UI
