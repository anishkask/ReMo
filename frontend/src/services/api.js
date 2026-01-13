/**
 * API Client Service for ReMo Backend
 */
const API_BASE_URL = 'http://localhost:8000';

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
    const response = await fetch(url, config);
    
    if (!response.ok) {
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
