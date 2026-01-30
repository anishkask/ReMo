# Use Python 3.11 slim image to ensure pydantic-core installs from wheels
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies (if needed for any Python packages)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Upgrade pip and install Python dependencies
# This ensures pydantic-core installs from pre-built wheels (not source)
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Copy Alembic configuration
COPY alembic.ini ./
COPY alembic/ ./alembic/

# Expose port (Render will override with $PORT env var)
EXPOSE 8000

# Run migrations and start the application
# Render sets $PORT environment variable, default to 8000 if not set
# Note: Migrations run automatically on startup. For production, consider running
# migrations separately via Render's "Release Command" or manually.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
