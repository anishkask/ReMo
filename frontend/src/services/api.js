/**
 * API Client Service for ReMo Backend
 * 
 * API base URL handling:
 * - Production: MUST use VITE_API_BASE_URL from environment (set in Vercel)
 * - Development: Fallback to localhost:8000 only if env var is missing
 * - NEVER references localhost/127.0.0.1 in production builds
 */
function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  
  // If env var is set, use it (required in production)
  if (envUrl) {
    return envUrl
  }
  
  // In production build, VITE_API_BASE_URL MUST be set
  // If missing, throw error to prevent localhost references
  if (import.meta.env.PROD) {
    console.error('VITE_API_BASE_URL is not set in production!')
    // In production, fail gracefully by using relative URLs
    // This assumes frontend and backend are on same domain
    return ''
  }
  
  // Development fallback: localhost:8000 (only in dev mode)
  return 'http://127.0.0.1:8000'
}

const API_BASE_URL = getApiBaseUrl()

// Log API base URL once at module load (for debugging)
if (typeof window !== 'undefined') {
  console.log(`[API] Using base URL: ${API_BASE_URL || '(relative URLs)'}`)
}

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  // Handle relative URLs in production (when API_BASE_URL is empty)
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Try to parse error message from response
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
        // If response is not JSON, use status text
        if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please wait a moment before posting again.';
        }
      }
      const error = new Error(errorMessage);
      error.status = response.status;  // Attach status for handling
      throw error;
    }
    
    return await response.json();
  } catch (error) {
    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('NetworkError')) {
      const friendlyError = new Error(`Cannot connect to backend server. Please check your connection and ensure the backend is running.`);
      friendlyError.originalError = error;
      throw friendlyError;
    }
    
    // Re-throw with original message if it's already user-friendly
    throw error;
  }
}

/**
 * Health check
 */
export async function checkHealth() {
  return apiRequest('/health');
}

/**
 * Get root message
 */
export async function getRoot() {
  return apiRequest('/');
}

/**
 * Get all moments
 */
export async function getMoments() {
  return apiRequest('/moments');
}

/**
 * Create a new moment
 */
export async function addMoment(moment) {
  return apiRequest('/moments', {
    method: 'POST',
    body: JSON.stringify(moment),
  });
}

/**
 * Authenticate with Google ID token
 */
export async function authGoogle(idToken) {
  return apiRequest('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
}

/**
 * Get all videos
 */
export async function getVideos() {
  return apiRequest('/videos');
}

/**
 * Get a single video by ID
 */
export async function getVideo(videoId) {
  return apiRequest(`/videos/${videoId}`);
}

/**
 * Get comments for a video
 */
export async function getComments(videoId) {
  return apiRequest(`/videos/${videoId}/comments`);
}

/**
 * Create a comment for a video
 */
export async function postComment(videoId, comment) {
  return apiRequest(`/videos/${videoId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });
}

/**
 * Seed database with sample videos
 */
export async function seedDatabase() {
  return apiRequest('/seed', {
    method: 'POST',
  });
}

/**
 * Delete a comment
 * Uses DELETE /videos/{video_id}/comments/{comment_id} endpoint
 */
export async function deleteComment(videoId, commentId, userId = null) {
  const url = `/videos/${videoId}/comments/${commentId}`
  // Add user_id as query param for authorization (backend checks if it matches comment.author_id)
  const queryParam = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
  
  // Handle relative URLs in production
  const fullUrl = API_BASE_URL ? `${API_BASE_URL}${url}${queryParam}` : `${url}${queryParam}`
  
  const response = await fetch(fullUrl, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('You can only delete your own comments')
    } else if (response.status === 404) {
      throw new Error('Comment not found')
    }
    throw new Error(`Failed to delete comment: ${response.status} ${response.statusText}`)
  }
  
  // 204 No Content - return success indicator
  return { success: true }
}