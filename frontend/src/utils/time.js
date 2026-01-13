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
