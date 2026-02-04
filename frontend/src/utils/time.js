/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 * @param {string} timestamp - Timestamp string
 * @returns {number} - Seconds
 */
export function parseTimestampToSeconds(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return 0
  
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

/**
 * Format seconds to timestamp string (MM:SS or HH:MM:SS)
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
export function formatSecondsToTimestamp(seconds) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  } else {
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
}

/**
 * Format comment timestamp as relative time or absolute date
 * @param {string} isoString - ISO date string from backend
 * @returns {string} - Formatted time string (e.g., "now", "10 min ago", "5 hours ago", "01/15/24")
 */
export function formatCommentTime(isoString) {
  if (!isoString || typeof isoString !== 'string') {
    return ''
  }

  try {
    const commentDate = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - commentDate.getTime()
    
    // Handle invalid dates
    if (isNaN(diffMs) || diffMs < 0) {
      return ''
    }
    
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    // Show relative time for recent comments
    if (diffSeconds < 60) {
      return 'now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    } else {
      // 24+ hours: show absolute date (MM/DD/YY)
      const month = String(commentDate.getMonth() + 1).padStart(2, '0')
      const day = String(commentDate.getDate()).padStart(2, '0')
      const year = String(commentDate.getFullYear()).slice(-2)
      return `${month}/${day}/${year}`
    }
  } catch (error) {
    console.error('Error formatting comment time:', error)
    return ''
  }
}
