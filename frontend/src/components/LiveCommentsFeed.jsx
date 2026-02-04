import { useEffect, useState, useRef, useCallback } from 'react'
import { formatCommentTime, formatCommentTimeTooltip, parseTimestampToSeconds } from '../utils/time'

function LiveReactionsFeed({ moments, commentsByMomentId, currentTime, onDeleteComment, currentUserId, showAllComments = false, onToggleShowAll, isLoading = false }) {
  const feedRef = useRef(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const lastScrollHeightRef = useRef(0)

  // Flatten all comments with their moment timestamps
  // First, create a map of momentId -> moment for quick lookup
  const momentMap = {}
  if (moments) {
    moments.forEach(moment => {
      if (moment && moment.id) {
        momentMap[moment.id] = moment
      }
    })
  }

  const allComments = []
  if (commentsByMomentId) {
    // Iterate directly over commentsByMomentId to ensure we get all comments
    Object.keys(commentsByMomentId).forEach(momentId => {
      const comments = commentsByMomentId[momentId] || []
      const moment = momentMap[momentId]
      
      // If moment exists, use its timestamp; otherwise try to extract from momentId or use 0
      let momentTimestamp = '00:00'
      let momentSeconds = 0
      
      if (moment && moment.timestamp) {
        momentTimestamp = moment.timestamp
        momentSeconds = parseTimestampToSeconds(moment.timestamp)
      } else {
        // Try to extract timestamp from momentId (format: moment-videoId-MM-SS)
        const match = momentId.match(/(\d{2})-(\d{2})(?:-(\d{2}))?$/)
        if (match) {
          if (match[3]) {
            // HH:MM:SS format
            momentTimestamp = `${match[1]}:${match[2]}:${match[3]}`
            momentSeconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3])
          } else {
            // MM:SS format
            momentTimestamp = `${match[1]}:${match[2]}`
            momentSeconds = parseInt(match[1]) * 60 + parseInt(match[2])
          }
        }
      }
      
      comments.forEach((comment) => {
        allComments.push({
          ...comment,
          momentId: momentId,
          momentTimestamp: momentTimestamp,
          momentSeconds: momentSeconds,
          authorId: comment.authorId || null,  // Preserve authorId for delete check
          createdAt: comment.createdAt || comment.createdAtISO || null  // Support both field names
        })
      })
    })
  }

  // Filter comments based on showAllComments toggle
  // When showAllComments is true, show all comments regardless of currentTime
  // When false, show comments within ±10 seconds of currentTime (near current playback)
  const TIME_WINDOW_SECONDS = 10
  const visibleComments = allComments
    .filter(comment => {
      if (showAllComments) {
        return true
      }
      // Default view: show comments within ±10 seconds of current playback time
      return Math.abs(comment.momentSeconds - currentTime) <= TIME_WINDOW_SECONDS
    })
    .sort((a, b) => {
      // Sort by timestamp_seconds first, then by created_at
      if (a.momentSeconds !== b.momentSeconds) {
        return a.momentSeconds - b.momentSeconds
      }
      // If same timestamp, sort by created_at
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return aTime - bTime
    })
  
  // Compute active comments (for count display in default view)
  const activeComments = allComments.filter(comment => 
    Math.abs(comment.momentSeconds - currentTime) <= TIME_WINDOW_SECONDS
  )

  // Auto-scroll to bottom when new comments appear (unless user scrolled up)
  useEffect(() => {
    if (!feedRef.current || userScrolled) return

    const container = feedRef.current
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50

    // Only auto-scroll if we're at the bottom or new content appeared
    if (isAtBottom || container.scrollHeight > lastScrollHeightRef.current) {
      container.scrollTop = container.scrollHeight
      lastScrollHeightRef.current = container.scrollHeight
    }
  }, [visibleComments, userScrolled])

  // Detect manual scrolling
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    
    const container = feedRef.current
    const { scrollTop, scrollHeight, clientHeight } = container
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    
    if (isAtBottom) {
      setUserScrolled(false)
    } else {
      setUserScrolled(true)
    }
  }, [])

  // Reset scroll state when video restarts
  useEffect(() => {
    if (currentTime < 0.5) {
      setUserScrolled(false)
      lastScrollHeightRef.current = 0
    }
  }, [currentTime])

  // Count total comments
  const totalCommentCount = allComments.length
  const activeCommentCount = activeComments.length

  return (
    <div className="live-reactions-feed">
      <div className="feed-header">
        <div className="feed-header-left">
          {isLoading ? (
            <span className="comments-loading">Loading comments...</span>
          ) : (
            <span className="comments-count">
              {totalCommentCount === 0 
                ? 'No comments' 
                : showAllComments 
                  ? `${totalCommentCount} comment${totalCommentCount !== 1 ? 's' : ''}`
                  : `${activeCommentCount} of ${totalCommentCount} comment${totalCommentCount !== 1 ? 's' : ''}`
              }
            </span>
          )}
        </div>
        <label className="show-all-comments-toggle">
          <input
            type="checkbox"
            checked={showAllComments}
            onChange={(e) => {
              // This will be handled by parent component
              if (onToggleShowAll) {
                onToggleShowAll(e.target.checked)
              }
            }}
          />
          <span>Show all comments</span>
        </label>
      </div>
      <div className="feed-container" ref={feedRef} onScroll={handleScroll}>
        {isLoading ? (
          <div className="feed-empty">
            <p>Loading comments...</p>
          </div>
        ) : visibleComments.length === 0 ? (
          <div className="feed-empty">
            <p>{showAllComments ? 'No comments yet' : 'Comments will appear here as the video plays...'}</p>
          </div>
        ) : (
          visibleComments.map((comment) => {
            const canDelete = onDeleteComment && currentUserId && comment.authorId === currentUserId
            const isActive = comment.momentSeconds <= currentTime
            return (
              <div 
                key={comment.id} 
                className={`reaction-comment-item ${!showAllComments && isActive ? 'comment-active' : ''}`}
              >
                <div className="reaction-comment-avatar">
                  {comment.author ? comment.author.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="reaction-comment-content">
                  <div className="reaction-comment-header">
                    <span className="reaction-comment-author">{comment.author || 'Anonymous'}</span>
                    {comment.createdAt && (
                      <span 
                        className="reaction-comment-relative-time"
                        title={formatCommentTimeTooltip(comment.createdAt)}
                      >
                        {formatCommentTime(comment.createdAt)}
                      </span>
                    )}
                    {canDelete && (
                      <button
                        className="reaction-comment-delete-button"
                        onClick={() => {
                          // Use momentId from comment, or find moment by timestamp
                          const momentId = comment.momentId || (moments?.find(m => m.timestamp === comment.momentTimestamp)?.id)
                          if (momentId && onDeleteComment) {
                            onDeleteComment(comment.id, momentId)
                          }
                        }}
                        title="Delete comment"
                        aria-label="Delete comment"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="reaction-comment-text">{comment.text}</div>
                </div>
                <div className="reaction-comment-timestamp">
                  {comment.momentTimestamp}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default LiveReactionsFeed
