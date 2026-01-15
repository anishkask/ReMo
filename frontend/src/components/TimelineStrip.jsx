import { useState, useRef } from 'react'
import { parseTimestampToSeconds } from '../utils/time'

/**
 * TimelineStrip component - shows progress line, 5s tick marks, comment markers, and current time indicator
 */
function TimelineStrip({ duration, currentTime, moments, commentsByMomentId, onSeek, onMarkerClick }) {
  const [selectedMarkerTimestamp, setSelectedMarkerTimestamp] = useState(null)
  const timelineRef = useRef(null)

  if (!duration || duration === 0) return null

  // Generate tick marks every 5 seconds
  const ticks = []
  for (let i = 0; i <= duration; i += 5) {
    ticks.push(i)
  }

  // Convert moments to markers with seconds
  const markers = (moments || [])
    .filter(m => m && m.timestamp)
    .map(m => ({
      ...m,
      seconds: parseTimestampToSeconds(m.timestamp)
    }))
    .filter(m => m.seconds >= 0 && m.seconds <= duration)

  // Handle marker click
  const handleMarkerClick = (e, marker) => {
    e.stopPropagation()
    if (onSeek && marker.seconds !== undefined) {
      onSeek(marker.seconds)
    }
    if (onMarkerClick) {
      onMarkerClick(marker)
    }
    
    // Highlight marker briefly
    setSelectedMarkerTimestamp(marker.seconds)
    setTimeout(() => {
      setSelectedMarkerTimestamp(null)
    }, 1000)
  }

  // Calculate positions
  const currentTimePercent = (currentTime / duration) * 100

  return (
    <div className="timeline-strip-container" ref={timelineRef}>
      <div className="timeline-strip">
        {/* Progress line */}
        <div className="timeline-progress-line" />
        
        {/* Tick marks */}
        {ticks.map((tickSeconds) => {
          const tickPercent = (tickSeconds / duration) * 100
          return (
            <div
              key={`tick-${tickSeconds}`}
              className="timeline-tick"
              style={{ left: `${tickPercent}%` }}
            />
          )
        })}
        
        {/* Comment markers */}
        {markers.map((marker) => {
          const markerPercent = (marker.seconds / duration) * 100
          const isSelected = selectedMarkerTimestamp === marker.seconds
          
          return (
            <div
              key={marker.id}
              className={`timeline-marker ${isSelected ? 'selected' : ''}`}
              style={{ left: `${markerPercent}%` }}
              onClick={(e) => handleMarkerClick(e, marker)}
              title={marker.timestamp}
            />
          )
        })}
        
        {/* Current time indicator */}
        <div
          className="timeline-current-indicator"
          style={{ left: `${currentTimePercent}%` }}
        />
      </div>
    </div>
  )
}

export default TimelineStrip
