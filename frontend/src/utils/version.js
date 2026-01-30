/**
 * Version information for deployment tracking
 * This helps verify that the deployed frontend matches the latest commit
 */

// Get version from package.json or use a default
// In production builds, this can be replaced with actual commit hash via Vite's define
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

// Get build timestamp (set at build time)
export const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

// Get git commit hash (set at build time via Vercel)
export const GIT_COMMIT = import.meta.env.VITE_GIT_COMMIT || null;

// Get environment (development, production, etc.)
export const ENV = import.meta.env.MODE || 'development';

/**
 * Get a display-friendly version string
 */
export function getVersionString() {
  if (ENV === 'production') {
    // In production, prefer commit hash, then version, then build time
    if (GIT_COMMIT) {
      return GIT_COMMIT.substring(0, 7); // Short commit hash
    }
    if (APP_VERSION !== 'dev') {
      return `v${APP_VERSION}`;
    }
    // Fallback to build date
    return BUILD_TIME.slice(0, 10).replace(/-/g, ''); // YYYYMMDD format
  }
  // In development, show dev + date
  return `dev-${BUILD_TIME.slice(0, 10)}`; // Show date in dev
}
