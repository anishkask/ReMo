"""
Rate limiting middleware for comment creation
Prevents abuse by limiting comment creation per user
"""
from fastapi import Request, HTTPException
from datetime import datetime, timedelta
from typing import Dict, Tuple
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# Rate limit configuration
RATE_LIMIT_WINDOW_SECONDS = 10  # 10 second window
RATE_LIMIT_MAX_COMMENTS = 5  # Max 5 comments per window

# In-memory store: {user_id: [(timestamp1, timestamp2, ...)]}
# In production, use Redis or similar distributed cache
_rate_limit_store: Dict[str, list] = defaultdict(list)


def check_rate_limit(user_id: str) -> Tuple[bool, int]:
    """
    Check if user has exceeded rate limit.
    Returns (is_allowed, seconds_until_reset)
    """
    if not user_id:
        # Guest users: use IP-based rate limiting (simplified - use user_id for now)
        # For production, extract IP from request
        user_id = "guest"
    
    now = datetime.now()
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS)
    
    # Clean old entries
    user_timestamps = _rate_limit_store[user_id]
    user_timestamps[:] = [ts for ts in user_timestamps if ts > window_start]
    
    # Check if limit exceeded
    if len(user_timestamps) >= RATE_LIMIT_MAX_COMMENTS:
        # Calculate seconds until oldest entry expires
        if user_timestamps:
            oldest = min(user_timestamps)
            seconds_until_reset = (oldest + timedelta(seconds=RATE_LIMIT_WINDOW_SECONDS) - now).total_seconds()
            return False, max(0, int(seconds_until_reset))
        return False, RATE_LIMIT_WINDOW_SECONDS
    
    # Record this request
    user_timestamps.append(now)
    return True, 0


def get_rate_limit_error_message(seconds_until_reset: int) -> str:
    """Generate user-friendly rate limit error message"""
    if seconds_until_reset <= 1:
        return "Rate limit exceeded. Please wait a moment before posting again."
    return f"Rate limit exceeded. Please wait {seconds_until_reset} seconds before posting again."
