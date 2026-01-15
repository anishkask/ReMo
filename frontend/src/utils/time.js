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
 * @param {string} isoString - ISO date string
 * @returns {string} - Formatted time string
 */
export function formatCommentTime(isoString) {
  if (!isoString || typeof isoString !== 'string') {
    return ''
  }

  try {
    const commentDate = new Date(isoString)
    const now = new Date()
    const diffMs = now - commentDate
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    // If comment is 7 days or older, show absolute date
    if (diffDays >= 7) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(commentDate)
    }

    // Otherwise, show relative time
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDaysRounded = Math.floor(diffDays)

    if (diffSeconds < 60) {
      return rtf.format(-diffSeconds, 'second')
    } else if (diffMinutes < 60) {
      return rtf.format(-diffMinutes, 'minute')
    } else if (diffHours < 24) {
      return rtf.format(-diffHours, 'hour')
    } else {
      return rtf.format(-diffDaysRounded, 'day')
    }
  } catch (error) {
    console.error('Error formatting comment time:', error)
    return ''
  }
}
