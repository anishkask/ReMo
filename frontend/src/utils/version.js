/**
 * Version information for deployment tracking
 * This helps verify that the deployed frontend matches the latest commit
 */

// Get version from package.json or use a default
// In production builds, this can be replaced with actual commit hash via Vite's define
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

// Get build timestamp
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

// Get environment (development, production, etc.)
export const ENV = import.meta.env.MODE || 'development';

/**
 * Get a display-friendly version string
 */
export function getVersionString() {
  if (ENV === 'production') {
    // In production, show version or commit hash
    return APP_VERSION !== 'dev' ? `v${APP_VERSION}` : 'production';
  }
  return `dev-${BUILD_TIME.slice(0, 10)}`; // Show date in dev
}
