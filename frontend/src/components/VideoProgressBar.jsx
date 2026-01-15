import { useRef, useState } from 'react'
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

function VideoProgressBar({ duration, moments, commentsByMomentId, onSeek, onSelectMoment }) {
  const progressBarRef = useRef(null)
  const [hoveredMarker, setHoveredMarker] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0 })

  if (!duration || duration === 0) return null

  // Convert moments to include seconds and filter valid ones
  const momentsWithSeconds = (moments || [])
    .filter(m => m && m.timestamp)
    .map(m => ({
      ...m,
      seconds: timestampToSeconds(m.timestamp)
    }))
    .filter(m => m.seconds >= 0 && m.seconds <= duration)

  const handleMarkerClick = (e, moment) => {
    e.stopPropagation()
    if (onSeek && moment.seconds !== undefined) {
      onSeek(moment.seconds)
    }
    if (onSelectMoment) {
      onSelectMoment(moment)
    }
  }

  const handleMarkerHover = (e, moment) => {
    if (!progressBarRef.current) return
    
    const rect = progressBarRef.current.getBoundingClientRect()
    const markerLeftPercent = (moment.seconds / duration) * 100
    const markerLeftPx = (markerLeftPercent / 100) * rect.width
    
    // Clamp tooltip position to prevent overflow
    const tooltipWidth = 250
    let adjustedLeft = markerLeftPx - tooltipWidth / 2
    
    // Clamp to container bounds
    if (adjustedLeft < 10) {
      adjustedLeft = 10
    } else if (adjustedLeft + tooltipWidth > rect.width - 10) {
      adjustedLeft = rect.width - tooltipWidth - 10
    }
    
    setTooltipPosition({ left: adjustedLeft })
    setHoveredMarker(moment)
  }

  const handleMarkerLeave = () => {
    setHoveredMarker(null)
  }

  // Get comments for a moment
  const getCommentsForMoment = (momentId) => {
    return commentsByMomentId[momentId] || []
  }

  return (
    <div className="video-progress-bar-container" ref={progressBarRef}>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: '0%' }} />
        {momentsWithSeconds.map((moment) => {
          const position = Math.max(0, Math.min(100, (moment.seconds / duration) * 100))
          
          return (
            <div
              key={moment.id}
              className="moment-marker"
              style={{ left: `${position}%` }}
              onClick={(e) => handleMarkerClick(e, moment)}
              onMouseEnter={(e) => handleMarkerHover(e, moment)}
              onMouseLeave={handleMarkerLeave}
            />
          )
        })}
      </div>
      {hoveredMarker && (
        <div 
          className="marker-tooltip"
          style={{ 
            left: `${tooltipPosition.left}px`,
            bottom: '100%'
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-timestamp">{hoveredMarker.timestamp}</span>
          </div>
          <div className="tooltip-text">{hoveredMarker.text || 'Moment'}</div>
          <div className="tooltip-comment-count">
            {(() => {
              const comments = getCommentsForMoment(hoveredMarker.id)
              const count = comments.length
              return count === 0 ? 'No comments yet' : `${count} comment${count !== 1 ? 's' : ''}`
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoProgressBar
