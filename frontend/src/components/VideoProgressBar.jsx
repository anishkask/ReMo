import { useRef, useEffect, useState } from 'react'

function VideoProgressBar({ videoRef, duration, currentTime, onMarkerClick }) {
  const progressBarRef = useRef(null)
  const [markers, setMarkers] = useState([])

  useEffect(() => {
    if (duration && duration > 0) {
      // Create markers every 5 seconds
      const markerCount = Math.floor(duration / 5)
      const newMarkers = []
      for (let i = 0; i <= markerCount; i++) {
        newMarkers.push(i * 5)
      }
      setMarkers(newMarkers)
    }
  }, [duration])

  const handleMarkerClick = (e, seconds) => {
    e.stopPropagation()
    if (onMarkerClick) {
      onMarkerClick(seconds)
    }
  }

  if (!duration || duration === 0) return null

  return (
    <div className="video-progress-bar-container" ref={progressBarRef}>
      <div className="video-progress-bar">
        {markers.map((seconds) => {
          const position = (seconds / duration) * 100
          return (
            <div
              key={seconds}
              className="progress-marker"
              style={{ left: `${position}%` }}
              onClick={(e) => handleMarkerClick(e, seconds)}
              title={`${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default VideoProgressBar
