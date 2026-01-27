/**
 * API Client Service for ReMo Backend
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Normalize API base URL by removing trailing slash
 */
function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

/**
 * Normalize endpoint by ensuring it starts with a slash
 */
function normalizeEndpoint(endpoint) {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

/**
 * Get access token from localStorage
 */
function getAccessToken() {
  return localStorage.getItem('remo_access_token')
}

/**
 * Generic API request handler
 */
async function apiRequest(endpoint, options = {}) {
  // Normalize base URL (remove trailing slash) and endpoint (ensure leading slash)
  const baseUrl = normalizeBaseUrl(API_BASE_URL);
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const url = `${baseUrl}${normalizedEndpoint}`;
  const token = getAccessToken()
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle 401 - token might be expired
      if (response.status === 401) {
        // Clear invalid token
        localStorage.removeItem('remo_access_token')
        localStorage.removeItem('remo_auth_user')
        throw new Error('Authentication required')
      }
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
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
