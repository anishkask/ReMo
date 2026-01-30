import { useEffect, useState, useRef, useCallback } from 'react'
import { formatCommentTime, parseTimestampToSeconds } from '../utils/time'

function LiveReactionsFeed({ moments, commentsByMomentId, currentTime, onDeleteComment, currentUserId }) {
  const feedRef = useRef(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const lastScrollHeightRef = useRef(0)

  // Flatten all comments with their moment timestamps
  const allComments = []
  if (moments && commentsByMomentId) {
    moments.forEach((moment) => {
      if (!moment || !moment.timestamp) return
      const comments = commentsByMomentId[moment.id] || []
      const momentSeconds = parseTimestampToSeconds(moment.timestamp)
      
      comments.forEach((comment) => {
        allComments.push({
          ...comment,
          momentTimestamp: moment.timestamp,
          momentSeconds: momentSeconds,
          authorId: comment.authorId || null  // Preserve authorId for delete check
        })
      })
    })
  }

  // Filter comments where timestampSeconds <= currentTime
  const visibleComments = allComments
    .filter(comment => comment.momentSeconds <= currentTime)
    .sort((a, b) => a.momentSeconds - b.momentSeconds)

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

  return (
    <div className="live-reactions-feed">
      <div className="feed-container" ref={feedRef} onScroll={handleScroll}>
        {visibleComments.length === 0 ? (
          <div className="feed-empty">
            <p>Comments will appear here as the video plays...</p>
          </div>
        ) : (
          visibleComments.map((comment) => {
            const canDelete = onDeleteComment && currentUserId && comment.authorId === currentUserId
            return (
              <div key={comment.id} className="reaction-comment-item">
                <div className="reaction-comment-avatar">
                  {comment.author ? comment.author.charAt(0).toUpperCase() : '?'}
                </div>
                <div className="reaction-comment-content">
                  <div className="reaction-comment-header">
                    <span className="reaction-comment-author">{comment.author || 'Anonymous'}</span>
                    {comment.createdAt && (
                      <span className="reaction-comment-relative-time">
                        {formatCommentTime(comment.createdAt)}
                      </span>
                    )}
                    {canDelete && (
                      <button
                        className="reaction-comment-delete-button"
                        onClick={() => {
                          // Find moment ID for this comment
                          const moment = moments.find(m => m.timestamp === comment.momentTimestamp)
                          if (moment && onDeleteComment) {
                            onDeleteComment(comment.id, moment.id)
                          }
                        }}
                        title="Delete comment"
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
