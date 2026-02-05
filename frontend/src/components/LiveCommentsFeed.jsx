import { useEffect, useState, useRef, useCallback } from 'react'
import { formatVideoTimestamp, formatTimeAgo, formatCommentTimeTooltip, parseTimestampToSeconds } from '../utils/time'
import AddCommentBar from './AddCommentBar'

function LiveReactionsFeed({ 
  moments, 
  commentsByMomentId, 
  currentTime, 
  onDeleteComment, 
  currentUserId, 
  showAllComments = false, 
  onToggleShowAll, 
  isLoading = false,
  revealedCommentIds = new Set(),
  onRevealComments,
  displayName,
  authUser,
  onAddComment,
  onRequestName
}) {
  const feedRef = useRef(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const lastScrollHeightRef = useRef(0)
  const lastCurrentTimeRef = useRef(0)

  // Flatten all comments with their timestamps
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
    Object.keys(commentsByMomentId).forEach(momentId => {
      const comments = commentsByMomentId[momentId] || []
      const moment = momentMap[momentId]
      
      let momentTimestamp = '00:00'
      let momentSeconds = 0
      
      if (moment && moment.timestamp) {
        momentTimestamp = moment.timestamp
        momentSeconds = parseTimestampToSeconds(moment.timestamp)
      } else {
        // Try to extract timestamp from momentId
        const match = momentId.match(/(\d{2})-(\d{2})(?:-(\d{2}))?$/)
        if (match) {
          if (match[3]) {
            momentTimestamp = `${match[1]}:${match[2]}:${match[3]}`
            momentSeconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3])
          } else {
            momentTimestamp = `${match[1]}:${match[2]}`
            momentSeconds = parseInt(match[1]) * 60 + parseInt(match[2])
          }
        }
      }
      
      comments.forEach((comment) => {
        // Use timestamp_seconds from comment if available, otherwise use moment timestamp
        // Comments from backend have timestampSeconds, comments from grouping might need moment timestamp
        const commentTimestampSeconds = comment.timestampSeconds !== undefined 
          ? comment.timestampSeconds 
          : momentSeconds
        
        allComments.push({
          ...comment,
          momentId: momentId,
          momentTimestamp: momentTimestamp,
          timestampSeconds: commentTimestampSeconds,  // Use actual comment timestamp
          authorId: comment.authorId || null,
          createdAt: comment.createdAt || comment.createdAtISO || null,
          text: comment.text || comment.body || ''  // Support both field names
        })
      })
    })
  }

  // Update revealed comments when currentTime increases
  useEffect(() => {
    // Only update when currentTime increases (forward playback)
    if (currentTime > lastCurrentTimeRef.current) {
      const newlyRevealed = []
      allComments.forEach(comment => {
        const timestampSeconds = comment.timestampSeconds !== undefined ? comment.timestampSeconds : 0
        // Reveal comment if its timestamp has been reached and not already revealed
        if (timestampSeconds <= currentTime && !revealedCommentIds.has(comment.id)) {
          newlyRevealed.push(comment.id)
        }
      })
      
      if (newlyRevealed.length > 0 && onRevealComments) {
        onRevealComments(newlyRevealed)
      }
      
      lastCurrentTimeRef.current = currentTime
    } else if (currentTime < lastCurrentTimeRef.current) {
      // Video seeked backwards - update ref but don't hide revealed comments
      // Once revealed, comments stay visible even if video is seeked back
      lastCurrentTimeRef.current = currentTime
    }
  }, [currentTime, allComments, revealedCommentIds, onRevealComments])

  // Determine visible comments based on showAllComments toggle
  const visibleComments = allComments
    .filter(comment => {
      const timestampSeconds = comment.timestampSeconds !== undefined ? comment.timestampSeconds : 0
      if (showAllComments) {
        return true  // Show all when toggle is ON
      }
      // Default: only show revealed comments (timestamp_seconds <= currentTime OR already revealed)
      return timestampSeconds <= currentTime || revealedCommentIds.has(comment.id)
    })
    .sort((a, b) => {
      // Sort by timestamp_seconds ASC, then created_at ASC
      const aSeconds = a.timestampSeconds !== undefined ? a.timestampSeconds : 0
      const bSeconds = b.timestampSeconds !== undefined ? b.timestampSeconds : 0
      if (aSeconds !== bSeconds) {
        return aSeconds - bSeconds
      }
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return aTime - bTime
    })

  // Count revealed vs total
  const revealedCount = allComments.filter(c => {
    const timestampSeconds = c.timestampSeconds !== undefined ? c.timestampSeconds : 0
    return timestampSeconds <= currentTime || revealedCommentIds.has(c.id)
  }).length
  const totalCount = allComments.length

  // Auto-scroll to bottom when new comments appear (only if user is near bottom)
  useEffect(() => {
    if (!feedRef.current || userScrolled) return

    const container = feedRef.current
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50

    // Only auto-scroll if we're at the bottom or new content appeared
    if (isAtBottom || container.scrollHeight > lastScrollHeightRef.current) {
      container.scrollTop = container.scrollHeight
      lastScrollHeightRef.current = container.scrollHeight
      setShowJumpToLatest(false)
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
      setShowJumpToLatest(false)
    } else {
      setUserScrolled(true)
      setShowJumpToLatest(true)
    }
  }, [])

  // Jump to latest handler
  const handleJumpToLatest = useCallback(() => {
    if (!feedRef.current) return
    const container = feedRef.current
    container.scrollTop = container.scrollHeight
    setUserScrolled(false)
    setShowJumpToLatest(false)
  }, [])

  // Reset scroll state when video restarts
  useEffect(() => {
    if (currentTime < 0.5) {
      setUserScrolled(false)
      setShowJumpToLatest(false)
      lastScrollHeightRef.current = 0
    }
  }, [currentTime])

  return (
    <div className="live-reactions-feed">
      <div className="feed-header">
        <div className="feed-header-left">
          {isLoading ? (
            <span className="comments-loading">Loading comments...</span>
          ) : (
            <span className="comments-count">
              {totalCount === 0 
                ? 'No comments' 
                : showAllComments 
                  ? `${totalCount} comment${totalCount !== 1 ? 's' : ''}`
                  : `${revealedCount} of ${totalCount} comment${totalCount !== 1 ? 's' : ''}`
              }
            </span>
          )}
        </div>
        <label className="show-all-comments-toggle">
          <input
            type="checkbox"
            checked={showAllComments}
            onChange={(e) => {
              if (onToggleShowAll) {
                onToggleShowAll(e.target.checked)
              }
            }}
          />
          <span>Show all comments</span>
        </label>
      </div>
      
      <div className="feed-container-wrapper">
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
              const timestampSeconds = comment.timestampSeconds !== undefined ? comment.timestampSeconds : 0
              const isRevealed = timestampSeconds <= currentTime || revealedCommentIds.has(comment.id)
              const isUpcoming = !isRevealed && showAllComments
              
              return (
                <div 
                  key={comment.id} 
                  className={`reaction-comment-item ${isRevealed ? 'comment-revealed' : ''} ${isUpcoming ? 'comment-upcoming' : ''}`}
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
                          {formatTimeAgo(comment.createdAt)}
                        </span>
                      )}
                      {isUpcoming && (
                        <span className="comment-upcoming-label">upcoming</span>
                      )}
                      {canDelete && (
                        <button
                          className="reaction-comment-delete-button"
                          onClick={() => {
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
                    {formatVideoTimestamp(timestampSeconds)}
                  </div>
                </div>
              )
            })
          )}
        </div>
        
        {/* Jump to latest button */}
        {showJumpToLatest && (
          <button 
            className="jump-to-latest-button"
            onClick={handleJumpToLatest}
            title="Jump to latest"
          >
            ↓ Jump to latest
          </button>
        )}
      </div>
      
      {/* Pinned composer at bottom */}
      <div className="feed-composer">
        <AddCommentBar
          currentTime={currentTime}
          displayName={displayName}
          authUser={authUser}
          onAddComment={onAddComment}
          onRequestName={onRequestName}
        />
      </div>
    </div>
  )
}

export default LiveReactionsFeed
