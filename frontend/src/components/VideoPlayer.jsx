import { useRef, useEffect } from 'react'

function VideoPlayer({ onTimeUpdate, onLoadedMetadata }) {
  const videoRef = useRef(null)

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
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [onTimeUpdate, onLoadedMetadata])

  // Use a sample video URL (placeholder)
  const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  return (
    <div className="video-player-container">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="video-player"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}

export default VideoPlayer
