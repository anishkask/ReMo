import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react'

const VideoPlayer = forwardRef(function VideoPlayer({ 
  src, 
  onTimeUpdate, 
  onLoadedMetadata, 
  onVideoClick, 
  moments,
  commentsByMomentId,
  onSeek,
  onSelectMoment
}, ref) {
  const videoRef = useRef(null)
  const [duration, setDuration] = useState(0)

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      if (videoRef.current) {
        videoRef.current.currentTime = seconds
      }
    }
  }))

  const handleVideoClick = (e) => {
    // Only handle clicks directly on the video element (not controls)
    if (e.target.tagName === 'VIDEO') {
      const video = videoRef.current
      if (!video || !video.duration) return

      // Calculate clicked position relative to video
      const rect = video.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickPercent = Math.max(0, Math.min(1, clickX / rect.width))
      const clickedTime = clickPercent * video.duration

      // Snap to nearest 5-second interval
      const snappedTime = Math.max(0, Math.round(clickedTime / 5) * 5)
      
      // Seek to snapped time
      video.currentTime = snappedTime

      // Call onVideoClick callback if provided
      if (onVideoClick) {
        onVideoClick(snappedTime)
      }
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      if (onTimeUpdate) {
        onTimeUpdate(video.currentTime)
      }
    }

    const handleLoadedMetadata = () => {
      if (onLoadedMetadata) {
        onLoadedMetadata(video.duration)
      }
      setDuration(video.duration)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [onTimeUpdate, onLoadedMetadata])

  // Use provided src or fallback
  const videoUrl = src || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  // Reset video when src changes
  useEffect(() => {
    const video = videoRef.current
    if (video && src) {
      video.load()
    }
  }, [src])

  return (
    <div className="video-player-wrapper">
      <div className="video-player-container" onClick={handleVideoClick}>
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="video-player"
          key={src} // Force re-render when src changes
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )
})

export default VideoPlayer
