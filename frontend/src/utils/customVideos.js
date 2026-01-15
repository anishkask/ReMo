/**
 * Custom Videos Storage Utility
 * Manages user-imported videos via URL in localStorage
 */

const STORAGE_KEY = 'remo_custom_videos'

/**
 * Load custom videos from localStorage
 */
export function loadCustomVideos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    
    const videos = JSON.parse(stored)
    // Validate it's an array
    return Array.isArray(videos) ? videos : []
  } catch (error) {
    console.error('Error loading custom videos:', error)
    return []
  }
}

/**
 * Save custom videos to localStorage
 */
export function saveCustomVideos(videos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
  } catch (error) {
    console.error('Error saving custom videos:', error)
  }
}

/**
 * Add a custom video
 */
export function addCustomVideo(video) {
  const videos = loadCustomVideos()
  videos.push(video)
  saveCustomVideos(videos)
  return video
}

/**
 * Remove a custom video by ID
 */
export function removeCustomVideo(id) {
  const videos = loadCustomVideos()
  const filtered = videos.filter(v => v.id !== id)
  saveCustomVideos(filtered)
}

/**
 * Validate MP4 URL
 */
export function validateMP4Url(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' }
  }

  if (url.length > 2000) {
    return { valid: false, error: 'URL is too long (max 2000 characters)' }
  }

  // Check if starts with http:// or https://
  if (!url.match(/^https?:\/\//i)) {
    return { valid: false, error: 'URL must start with http:// or https://' }
  }

  // Check if ends with .mp4 (allow query strings)
  if (!url.match(/\.mp4(\?|$)/i)) {
    return { valid: false, error: 'URL must point to an MP4 file (.mp4)' }
  }

  return { valid: true }
}

/**
 * Generate title from URL
 */
export function generateTitleFromUrl(url) {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const filename = pathname.split('/').pop() || 'Video'
    // Remove .mp4 extension
    return filename.replace(/\.mp4$/i, '') || 'Imported Video'
  } catch {
    return 'Imported Video'
  }
}
