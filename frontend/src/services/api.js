/**
 * API Client Service for ReMo Backend
 */
// Use 127.0.0.1 instead of localhost for better compatibility
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    console.log('Making API request to:', url);
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    console.error('Request URL:', url);
    console.error('Error details:', error.message);
    
    // Provide more specific error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      const friendlyError = new Error(`Cannot connect to backend at ${API_BASE_URL}. Make sure the backend server is running on port 8000.`);
      friendlyError.originalError = error;
      throw friendlyError;
    }
    
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
 */
export async function deleteComment(videoId, commentId, userId = null) {
  const url = `/videos/${videoId}/comments/${commentId}`
  // Add user_id as query param for authorization (backend checks if it matches comment.author_id)
  const queryParam = userId ? `?user_id=${encodeURIComponent(userId)}` : ''
  
  const response = await fetch(`${API_BASE_URL}${url}${queryParam}`, {
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