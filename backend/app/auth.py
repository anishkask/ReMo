"""
Authentication utilities for ReMo
- Google ID token verification
- JWT access token creation
- User authentication dependency
"""
import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from fastapi import HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.auth.transport import requests
from google.oauth2 import id_token

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

# Security scheme for Bearer token
security = HTTPBearer()

# In-memory user store (demo: could be replaced with database)
users_store: Dict[str, Dict] = {}


def verify_google_id_token(id_token_str: str) -> Dict:
    """
    Verify Google ID token and return user info
    Raises ValueError if token is invalid
    """
    if not GOOGLE_CLIENT_ID:
        raise ValueError("GOOGLE_CLIENT_ID not configured")
    
    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Verify the token is intended for our client
        if idinfo['aud'] != GOOGLE_CLIENT_ID:
            raise ValueError('Token audience mismatch')
        
        # Extract user info
        return {
            'sub': idinfo['sub'],
            'email': idinfo.get('email', ''),
            'name': idinfo.get('name', ''),
            'picture': idinfo.get('picture', ''),
        }
    except ValueError as e:
        raise ValueError(f"Invalid Google ID token: {str(e)}")


def create_access_token(user_id: str, email: str, name: str) -> str:
    """
    Create a JWT access token for the user
    """
    expiry = datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS)
    payload = {
        'sub': user_id,
        'email': email,
        'name': name,
        'exp': expiry,
        'iat': datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_access_token(token: str) -> Dict:
    """
    Verify and decode JWT access token
    Returns user payload if valid
    Raises HTTPException if invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
) -> Dict:
    """
    FastAPI dependency to get current authenticated user
    """
    token = credentials.credentials
    payload = verify_access_token(token)
    
    # Verify user still exists in store
    user_id = payload.get('sub')
    if user_id and user_id in users_store:
        user = users_store[user_id]
        return {
            'id': user_id,
            'email': user.get('email', payload.get('email', '')),
            'name': user.get('name', payload.get('name', '')),
            'picture': user.get('picture', ''),
        }
    
    raise HTTPException(status_code=401, detail="User not found")


def upsert_user(google_user: Dict) -> Dict:
    """
    Upsert user in the store
    Returns user dict
    """
    user_id = google_user['sub']
    users_store[user_id] = {
        'id': user_id,
        'email': google_user.get('email', ''),
        'name': google_user.get('name', ''),
        'picture': google_user.get('picture', ''),
        'updated_at': datetime.utcnow().isoformat(),
    }
    return users_store[user_id]
