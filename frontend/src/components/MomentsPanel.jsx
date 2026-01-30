import { useState, useEffect, useRef, useCallback } from 'react'
import { formatCommentTime, parseTimestampToSeconds, formatSecondsToTimestamp } from '../utils/time'

function MomentsPanel({ 
  moments, 
  currentTime, 
  displayedMoment, 
  followLive, 
  onFollowLive, 
  onDisableFollowLive,
  onTimestampClick, 
  commentsByMomentId, 
  onAddComment,
  onDeleteComment,
  onSeek,
  displayName,
  onRequestName,
  currentUserId
}) {
  const [commentText, setCommentText] = useState('')
  const [userScrolled, setUserScrolled] = useState(false)
  const feedRef = useRef(null)
  const headerRefs = useRef({})
  const lastActiveTimestampRef = useRef(null)
  const scrollTimeoutRef = useRef(null)

  // Build unified timeline items structure
  const buildTimelineItems = useCallback(() => {
    if (!moments || moments.length === 0) return []

    const items = []
    
    // Sort moments by timestamp
    const sortedMoments = [...moments].sort((a, b) => {
      const aSeconds = parseTimestampToSeconds(a.timestamp)
      const bSeconds = parseTimestampToSeconds(b.timestamp)
      return aSeconds - bSeconds
    })

    sortedMoments.forEach((moment) => {
      const timeSeconds = parseTimestampToSeconds(moment.timestamp)
      const timestampLabel = moment.timestamp
      const momentId = moment.id
      const comments = commentsByMomentId[momentId] || []

      // Add timestamp header
      items.push({
        type: 'header',
        timeSeconds,
        timestampLabel,
        momentId,
        momentText: moment.text,
        key: `header-${momentId}`
      })

      // Add comments under this timestamp
      comments.forEach((comment) => {
        items.push({
          type: 'comment',
          timeSeconds, // Use parent moment's timestamp
          timestampLabel,
          momentId,
          commentId: comment.id,
          author: comment.author || comment.displayName || 'Anonymous',
          authorId: comment.authorId || null,
          text: comment.text,
          createdAt: comment.createdAt || comment.createdAtISO,
          key: `comment-${comment.id}`
        })
      })
    })

    return items
  }, [moments, commentsByMomentId])

  const timelineItems = buildTimelineItems()

  // Compute active timestamp group
  const getActiveTimestamp = useCallback(() => {
    if (timelineItems.length === 0) return null
    
    const currentSeconds = currentTime
    const headers = timelineItems.filter(item => item.type === 'header')
    
    // Find the latest header with timeSeconds <= currentTime
    let activeHeader = null
    for (let i = headers.length - 1; i >= 0; i--) {
      if (headers[i].timeSeconds <= currentSeconds) {
        activeHeader = headers[i]
        break
      }
    }
    
    return activeHeader
  }, [timelineItems, currentTime])

  const activeTimestamp = getActiveTimestamp()

  // Auto-scroll to active timestamp when followLive is enabled
  useEffect(() => {
    if (!followLive || !activeTimestamp || userScrolled) return

    const activeKey = activeTimestamp.key
    if (lastActiveTimestampRef.current === activeKey) return // Already scrolled to this timestamp

    // Clear any pending scroll
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Small delay to batch rapid timestamp changes
    scrollTimeoutRef.current = setTimeout(() => {
      const headerElement = headerRefs.current[activeKey]
      if (headerElement && feedRef.current) {
        headerElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        })
        lastActiveTimestampRef.current = activeKey
      }
    }, 100)
  }, [followLive, activeTimestamp, userScrolled])

  // Detect manual scrolling
  const handleScroll = useCallback(() => {
    if (feedRef.current && followLive) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50 // 50px threshold
      
      // If user scrolls away from bottom, disable followLive
      if (!isAtBottom && onDisableFollowLive) {
        setUserScrolled(true)
        onDisableFollowLive()
      } else if (isAtBottom) {
        // If user scrolls back to bottom, re-enable auto-scroll
        setUserScrolled(false)
      }
    }
  }, [followLive, onDisableFollowLive])

  // Reset userScrolled when followLive is manually enabled and scroll to active timestamp
  useEffect(() => {
    if (followLive) {
      setUserScrolled(false)
      // Immediately scroll to active timestamp when followLive is enabled
      if (activeTimestamp) {
        const headerElement = headerRefs.current[activeTimestamp.key]
        if (headerElement && feedRef.current) {
          setTimeout(() => {
            headerElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start',
              inline: 'nearest'
            })
            lastActiveTimestampRef.current = activeTimestamp.key
          }, 100)
        }
      }
    }
  }, [followLive, activeTimestamp])

  // Handle timestamp click
  const handleTimestampClick = (timeSeconds, momentId) => {
    if (onSeek) {
      onSeek(timeSeconds)
    }
    if (onTimestampClick) {
      const moment = moments.find(m => m.id === momentId)
      if (moment) {
        onTimestampClick(moment)
      }
    }
    // Disable followLive when user clicks timestamp (handled in App.jsx via onTimestampClick)
  }

  // Handle comment submit
  const handleCommentSubmit = (e, momentId) => {
    e.preventDefault()
    if (!commentText.trim() || !momentId || !onAddComment || !displayName) return

    onAddComment(momentId, commentText)
    setCommentText('')
  }

  // Get the moment for the active timestamp (for comment input)
  const activeMoment = activeTimestamp 
    ? moments.find(m => m.id === activeTimestamp.momentId)
    : null

  if (timelineItems.length === 0) {
    return (
      <div className="moments-panel">
        <div className="feed-header">
          <h2>Live Reactions</h2>
          {followLive && <span className="live-pill">LIVE</span>}
        </div>
        <div className="feed-empty">
          <p>No reactions yet. Play the video to see moments.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="moments-panel">
      <div className="feed-header">
        <h2>Live Reactions</h2>
        {followLive && <span className="live-pill">LIVE</span>}
        {!followLive && onFollowLive && (
          <button 
            className="follow-live-button"
            onClick={onFollowLive}
          >
            Follow Live
          </button>
        )}
      </div>
      
      <div 
        className="timeline-feed"
        ref={feedRef}
        onScroll={handleScroll}
      >
        {timelineItems.map((item) => {
          if (item.type === 'header') {
            const isActive = activeTimestamp && activeTimestamp.key === item.key
            return (
              <div
                key={item.key}
                ref={(el) => {
                  if (el) headerRefs.current[item.key] = el
                }}
                data-timestamp={item.timeSeconds}
                className={`timeline-header ${isActive ? 'active' : ''}`}
              >
                <button
                  className="timestamp-button"
                  onClick={() => handleTimestampClick(item.timeSeconds, item.momentId)}
                >
                  {item.timestampLabel}
                </button>
                {item.momentText && (
                  <span className="moment-text">{item.momentText}</span>
                )}
                {isActive && <span className="current-indicator">● Current</span>}
              </div>
            )
          } else {
            // Comment item
            const canDelete = onDeleteComment && currentUserId && item.authorId === currentUserId
            return (
              <div key={item.key} className="timeline-comment">
                <div className="comment-header">
                  <span className="comment-author">{item.author}</span>
                  {item.createdAt && (
                    <span className="comment-time">{formatCommentTime(item.createdAt)}</span>
                  )}
                  {canDelete && (
                    <button
                      className="comment-delete-button"
                      onClick={() => onDeleteComment(item.commentId, item.momentId)}
                      title="Delete comment"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="comment-text">{item.text}</div>
              </div>
            )
          }
        })}
      </div>

      {/* Comment input for active moment */}
      {activeMoment && onAddComment && (
        <div className="comment-input-section">
          {!displayName ? (
            <div className="name-required-message">
              <p>Set your name to comment</p>
              <button 
                type="button"
                className="set-name-button"
                onClick={onRequestName}
              >
                Set Name
              </button>
            </div>
          ) : (
            <form onSubmit={(e) => handleCommentSubmit(e, activeMoment.id)}>
              <input
                type="text"
                placeholder={`Add a comment at ${activeMoment.timestamp}...`}
                className="comment-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit" 
                className="comment-submit" 
                disabled={!commentText.trim()}
              >
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

export default MomentsPanel
