import { useState } from 'react'
import { formatCommentTime } from '../utils/time'

/**
 * Convert timestamp string (MM:SS or HH:MM:SS) to seconds
 */
function timestampToSeconds(timestamp) {
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

function MomentsPanel({ moments, currentTime, selectedMoment, onTimestampClick, commentsByMomentId, onAddComment }) {
  const [commentText, setCommentText] = useState('')
  
  const safeMoments = Array.isArray(moments) ? moments : []
  const currentSeconds = currentTime || 0

  // Convert moments to include seconds
  const momentsWithSeconds = safeMoments
    .filter(m => m && typeof m.id !== 'undefined')
    .map(m => ({
      ...m,
      seconds: timestampToSeconds(m.timestamp)
    }))
    .sort((a, b) => a.seconds - b.seconds)

  // "Now" moments: within ±3 seconds
  const nowMoments = momentsWithSeconds.filter(
    m => Math.abs(m.seconds - currentSeconds) <= 3
  )

  // "Upcoming" moments: next 3 moments after currentTime
  const upcomingMoments = momentsWithSeconds
    .filter(m => m.seconds > currentSeconds)
    .slice(0, 3)

  // Check if a moment is "active" (within ±1 second)
  const isActive = (momentSeconds) => {
    return Math.abs(momentSeconds - currentSeconds) <= 1
  }

  // Check if a moment is selected
  const isSelected = (moment) => {
    return selectedMoment && selectedMoment.id === moment.id
  }

  const handleTimestampClick = (moment) => {
    if (onTimestampClick) {
      onTimestampClick(moment)
    }
  }

  // Get comments for a moment (seeded + user comments)
  const getCommentsForMoment = (momentId) => {
    return commentsByMomentId[momentId] || []
  }

  const handleCommentSubmit = (e) => {
    e.preventDefault()
    if (!commentText.trim() || !selectedMoment || !onAddComment) return

    // Add comment via parent handler
    onAddComment(selectedMoment.id, commentText)

    // Clear input
    setCommentText('')
  }

  // If a moment is selected, show its details
  if (selectedMoment) {
    const comments = getCommentsForMoment(selectedMoment.id)
    return (
      <div className="moments-panel">
        <div className="selected-moment-header">
          <button 
            className="back-button"
            onClick={() => onTimestampClick && onTimestampClick(null)}
          >
            ← Back
          </button>
          <h2>Moment: {selectedMoment.timestamp}</h2>
        </div>
        <div className="selected-moment-content">
          <p className="moment-description">{selectedMoment.text}</p>
          <div className="comments-section">
            <h3>Comments</h3>
            {comments.length === 0 ? (
              <p className="empty-state">No comments yet</p>
            ) : (
              <div className="comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      {comment.createdAt && (
                        <span className="comment-time">{formatCommentTime(comment.createdAt)}</span>
                      )}
                    </div>
                    <span className="comment-text">{comment.text}</span>
                  </div>
                ))}
              </div>
            )}
            <form className="add-comment-section" onSubmit={handleCommentSubmit}>
              <input
                type="text"
                placeholder="Add a comment..."
                className="comment-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button type="submit" className="comment-submit" disabled={!commentText.trim()}>
                Post
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Default view: show moments list
  return (
    <div className="moments-panel">
      <h2>Moments</h2>
      {safeMoments.length === 0 ? (
        <p className="empty-state">No moments found. Click a timestamp in the video to add one.</p>
      ) : (
        <>
          {nowMoments.length > 0 && (
        <div className="moments-section">
          <h3 className="section-title">Now</h3>
          <div className="moments-list">
            {nowMoments.map((moment) => (
              <div
                key={moment.id}
                className={`moment-item ${isActive(moment.seconds) ? 'active' : ''} ${isSelected(moment) ? 'selected' : ''}`}
              >
                <span 
                  className="moment-timestamp clickable"
                  onClick={() => handleTimestampClick(moment)}
                >
                  {moment.timestamp || ''}
                </span>
                <span className="moment-text">{moment.text || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingMoments.length > 0 && (
        <div className="moments-section">
          <h3 className="section-title">Upcoming</h3>
          <div className="moments-list">
            {upcomingMoments.map((moment) => (
              <div 
                key={moment.id} 
                className={`moment-item ${isSelected(moment) ? 'selected' : ''}`}
              >
                <span 
                  className="moment-timestamp clickable"
                  onClick={() => handleTimestampClick(moment)}
                >
                  {moment.timestamp || ''}
                </span>
                <span className="moment-text">{moment.text || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nowMoments.length === 0 && upcomingMoments.length === 0 && (
        <div className="moments-section">
          <h3 className="section-title">All Moments</h3>
          {momentsWithSeconds.length === 0 ? (
            <p className="empty-state">No moments found</p>
          ) : (
            <div className="moments-list">
              {momentsWithSeconds.map((moment) => (
                <div
                  key={moment.id}
                  className={`moment-item ${isActive(moment.seconds) ? 'active' : ''} ${isSelected(moment) ? 'selected' : ''}`}
                >
                  <span 
                    className="moment-timestamp clickable"
                    onClick={() => handleTimestampClick(moment)}
                  >
                    {moment.timestamp || ''}
                  </span>
                  <span className="moment-text">{moment.text || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default MomentsPanel
