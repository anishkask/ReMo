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
