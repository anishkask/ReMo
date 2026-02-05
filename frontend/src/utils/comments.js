/**
 * Comments persistence utility using localStorage
 * Schema: { [videoId]: [{ id, timestampSeconds, timestampLabel, text, displayName, createdAtISO }] }
 */

const STORAGE_KEY = 'remo_comments_v1'

/**
 * Load all comments from localStorage
 * @returns {Object} { [videoId]: [comments] }
 */
export function loadComments() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return {}
    return JSON.parse(stored)
  } catch (error) {
    console.error('Failed to load comments from localStorage:', error)
    return {}
  }
}

/**
 * Load comments for a specific video
 * @param {string} videoId
 * @returns {Array} Array of comment objects
 */
export function loadCommentsForVideo(videoId) {
  const allComments = loadComments()
  return allComments[videoId] || []
}

/**
 * Save a comment to localStorage
 * @param {string} videoId
 * @param {Object} comment - { id, timestampSeconds, timestampLabel, text, displayName, createdAtISO }
 */
export function saveComment(videoId, comment) {
  try {
    const allComments = loadComments()
    if (!allComments[videoId]) {
      allComments[videoId] = []
    }
    
    // Add new comment
    allComments[videoId].push(comment)
    
    // Sort by timestampSeconds, then createdAtISO
    allComments[videoId].sort((a, b) => {
      if (a.timestampSeconds !== b.timestampSeconds) {
        return a.timestampSeconds - b.timestampSeconds
      }
      return new Date(a.createdAtISO) - new Date(b.createdAtISO)
    })
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allComments))
  } catch (error) {
    console.error('Failed to save comment to localStorage:', error)
  }
}

/**
 * Convert flat comment array to grouped structure (by momentId)
 * @param {Array} comments - Flat array of comments
 * @param {Array} moments - Array of moments with id and timestamp
 * @returns {Object} { [momentId]: [comments] }
 */
export function groupCommentsByMoment(comments, moments) {
  const grouped = {}
  
  // Create a map of timestamp -> momentId
  const timestampToMomentId = {}
  moments.forEach(moment => {
    if (moment && moment.timestamp) {
      timestampToMomentId[moment.timestamp] = moment.id
    }
  })
  
  // Group comments by moment
  // If a comment doesn't have a matching moment, create a synthetic momentId
  const orphanMomentPrefix = 'orphan-moment-'
  let orphanCounter = 0
  
  comments.forEach(comment => {
    let momentId = timestampToMomentId[comment.timestampLabel]
    
    // If no matching moment, create a synthetic one
    if (!momentId) {
      // Try to create a momentId from the timestampLabel
      const sanitizedTimestamp = comment.timestampLabel?.replace(/:/g, '-') || '00-00'
      momentId = `${orphanMomentPrefix}${sanitizedTimestamp}-${orphanCounter++}`
    }
    
    if (!grouped[momentId]) {
      grouped[momentId] = []
    }
    
    // Convert to app format: { id, text, author, authorId, createdAt, timestampSeconds }
    grouped[momentId].push({
      id: comment.id,
      text: comment.text,
      author: comment.displayName,
      authorId: comment.authorId || null,  // Preserve authorId for delete functionality
      createdAt: comment.createdAtISO || comment.createdAt || null,
      timestampSeconds: comment.timestampSeconds  // Preserve timestampSeconds for live timeline
    })
  })
  
  return grouped
}

/**
 * Convert localStorage comment format to app format
 * @param {Array} storedComments - Comments from localStorage
 * @returns {Array} Comments in app format
 */
export function convertStoredCommentsToAppFormat(storedComments) {
  return storedComments.map(comment => ({
    id: comment.id,
    text: comment.text,
    author: comment.displayName,
    createdAt: comment.createdAtISO
  }))
}
