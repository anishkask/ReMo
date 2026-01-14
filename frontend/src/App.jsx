import { useState, useEffect, useRef } from 'react'
import './App.css'
import { checkHealth, getRoot, getMoments, addMoment } from './services/api'
import VideoPlayer from './components/VideoPlayer'
import MomentsPanel from './components/MomentsPanel'
import DisplayNamePrompt from './components/DisplayNamePrompt'
import { formatCommentTime, parseTimestampToSeconds } from './utils/time'

// Available videos for demo
// You can change these to any video URLs or local files
const VIDEOS = [
  {
    id: '1',
    title: 'Big Buck Bunny',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  },
  {
    id: '2',
    title: 'Elephant\'s Dream',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'
  },
  {
    id: '3',
    title: 'For Bigger Blazes',
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  }
  // Add more videos here:
  // {
  //   id: '4',
  //   title: 'Your Video Title',
  //   src: 'https://your-video-url.com/video.mp4'
  // }
]

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [showMenu, setShowMenu] = useState(true)
  const [momentsByVideoId, setMomentsByVideoId] = useState({})
  const [momentsLoading, setMomentsLoading] = useState(false)
  const [momentsError, setMomentsError] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selectedMoment, setSelectedMoment] = useState(null)
  const [followLive, setFollowLive] = useState(true)
  const [commentsByVideoId, setCommentsByVideoId] = useState({})
  const [displayName, setDisplayName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const videoPlayerRef = useRef(null)

  // Load display name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('remoDisplayName')
    if (savedName) {
      setDisplayName(savedName)
    } else {
      // Prompt for name on first visit
      setShowNamePrompt(true)
    }
  }, [])

  // Save display name to localStorage when it changes
  const handleSetDisplayName = (name) => {
    setDisplayName(name)
    localStorage.setItem('remoDisplayName', name)
    setShowNamePrompt(false)
  }

  // Get current video
  const currentVideo = selectedVideoId ? VIDEOS.find(v => v.id === selectedVideoId) : null
  
  // Get moments for current video
  const moments = selectedVideoId ? (momentsByVideoId[selectedVideoId] || []) : []
  
  // Get comments for current video
  const commentsByMomentId = selectedVideoId ? (commentsByVideoId[selectedVideoId] || {}) : {}

  // Convert timestamp to seconds helper
  const timestampToSeconds = (timestamp) => {
    if (!timestamp || typeof timestamp !== 'string') return 0
    const parts = timestamp.split(':').map(Number)
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1]
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]
    }
    return 0
  }

  // Compute active moment based on currentTime (for live-follow mode)
  const computeActiveMoment = () => {
    if (!moments || moments.length === 0) return null
    
    const currentSeconds = currentTime
    const momentsWithSeconds = moments
      .filter(m => m && m.timestamp)
      .map(m => ({
        ...m,
        seconds: timestampToSeconds(m.timestamp)
      }))
      .filter(m => m.seconds <= currentSeconds + 1) // Within 1 second window
      .sort((a, b) => b.seconds - a.seconds) // Latest first
    
    return momentsWithSeconds.length > 0 ? momentsWithSeconds[0] : null
  }

  // Determine which moment to show in panel
  const displayedMoment = followLive ? computeActiveMoment() : selectedMoment

  // Clear selectedMoment when switching to live-follow mode
  useEffect(() => {
    if (followLive) {
      setSelectedMoment(null)
    }
  }, [followLive])

  // Initialize seeded comments for each moment (per video)
  const initializeSeededComments = (momentsArray, videoId) => {
    const seeded = {}
    const now = new Date()
    
    momentsArray.forEach((moment) => {
      if (moment && moment.id) {
        // Create realistic past timestamps (some minutes/hours/days ago)
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
        const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        
        // Different seeded comments for each moment
        seeded[moment.id] = [
          { 
            id: `${videoId}-${moment.id}-1`, 
            text: 'Great moment!', 
            author: 'Alex',
            createdAt: twoHoursAgo
          },
          { 
            id: `${videoId}-${moment.id}-2`, 
            text: 'Love this part', 
            author: 'Sam',
            createdAt: fiveHoursAgo
          },
          { 
            id: `${videoId}-${moment.id}-3`, 
            text: 'This is amazing!', 
            author: 'Jordan',
            createdAt: oneDayAgo
          }
        ]
      }
    })
    return seeded
  }

  useEffect(() => {
    // Check backend connection on mount
    checkHealth()
      .then((data) => {
        setApiStatus('connected')
        return getRoot()
      })
      .then((data) => {
        setApiMessage(data?.message || '')
      })
      .catch((error) => {
        setApiStatus('disconnected')
        console.error('Failed to connect to backend:', error)
      })
  }, [])

  useEffect(() => {
    // Load moments when backend is connected
    if (apiStatus === 'connected') {
      setMomentsLoading(true)
      setMomentsError(null)
      getMoments()
        .then((data) => {
          // Guard against undefined/null moments
          const momentsArray = Array.isArray(data?.moments) ? data.moments : []
          
          // Initialize moments for all videos (same moments for demo)
          const momentsForAllVideos = {}
          const commentsForAllVideos = {}
          
          VIDEOS.forEach(video => {
            momentsForAllVideos[video.id] = momentsArray
            commentsForAllVideos[video.id] = initializeSeededComments(momentsArray, video.id)
          })
          
          setMomentsByVideoId(momentsForAllVideos)
          setCommentsByVideoId(commentsForAllVideos)
          setMomentsLoading(false)
        })
        .catch((error) => {
          setMomentsError('Failed to load moments')
          setMomentsLoading(false)
          setMoments([]) // Ensure moments is always an array
          console.error('Failed to load moments:', error)
        })
    }
  }, [apiStatus])

  const handleTimeUpdate = (time) => {
    setCurrentTime(time)
  }

  const handleLoadedMetadata = (dur) => {
    setDuration(dur)
  }

  const handleTimestampClick = (moment) => {
    if (moment) {
      // Convert timestamp to seconds
      const seconds = parseTimestampToSeconds(moment.timestamp)
      
      // Seek video to timestamp
      if (videoPlayerRef.current) {
        videoPlayerRef.current.seekTo(seconds)
      }
      
      // Set selected moment and disable live-follow
      setSelectedMoment(moment)
      setFollowLive(false)
    } else {
      // Clear selection
      setSelectedMoment(null)
    }
  }

  const handleVideoClick = (seconds) => {
    handleMarkerClick(seconds)
  }

  const handleSeek = (seconds) => {
    // Seek video to this time
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(seconds)
    }
  }

  const handleSelectMoment = (moment) => {
    // Set selected moment and disable live-follow
    setSelectedMoment(moment)
    setFollowLive(false)
  }

  const handleFollowLive = () => {
    setFollowLive(true)
    setSelectedMoment(null)
  }

  const handleDisableFollowLive = () => {
    setFollowLive(false)
  }

  const handleMarkerClick = (seconds) => {
    handleSeek(seconds)
    
    // Convert seconds to timestamp string (MM:SS or HH:MM:SS)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    let timestamp
    if (hours > 0) {
      timestamp = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    } else {
      timestamp = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }

    // Find moment at this timestamp, or create a placeholder
    const moment = moments.find(m => m.timestamp === timestamp)
    
    if (moment) {
      handleSelectMoment(moment)
    } else {
      // If no moment exists, create a temporary one for viewing
      handleSelectMoment({
        id: `temp-${timestamp}`,
        timestamp: timestamp,
        text: `Moment at ${timestamp}`
      })
    }
  }

  const handleAddComment = (momentId, commentText) => {
    if (!commentText.trim() || !momentId || !selectedVideoId || !displayName) return

    const newComment = {
      id: `user-${selectedVideoId}-${Date.now()}`,
      text: commentText.trim(),
      author: displayName,
      createdAt: new Date().toISOString()
    }

    setCommentsByVideoId(prev => ({
      ...prev,
      [selectedVideoId]: {
        ...(prev[selectedVideoId] || {}),
        [momentId]: [...((prev[selectedVideoId] || {})[momentId] || []), newComment]
      }
    }))
  }

  const handleVideoChange = (e) => {
    const newVideoId = e.target.value
    setSelectedVideoId(newVideoId)
    setShowMenu(false)
    // Reset state when video changes
    setSelectedMoment(null)
    setCurrentTime(0)
    // Reset video player
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(0)
    }
  }

  const handleVideoSelect = (videoId) => {
    setSelectedVideoId(videoId)
    setShowMenu(false)
    setSelectedMoment(null)
    setFollowLive(true)
    setCurrentTime(0)
  }

  const handleBackToMenu = () => {
    setShowMenu(true)
    setSelectedVideoId(null)
    setSelectedMoment(null)
    setFollowLive(true)
    setCurrentTime(0)
  }

  return (
    <div className={`app ${showMenu ? 'menu-mode' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>ReMo</h1>
            <p className="subtitle">Real-time Media Moments</p>
          </div>
          {displayName && (
            <div className="display-name-indicator">
              <span className="name-label">Guest:</span>
              <span className="name-value">{displayName}</span>
              <button 
                className="change-name-button"
                onClick={() => setShowNamePrompt(true)}
                title="Change display name"
              >
                ✎
              </button>
            </div>
          )}
        </div>
      </header>
      
      <main className="app-main">
        <div className="status-card">
          <h2>Backend Status</h2>
          <p className={`status ${apiStatus}`}>
            {apiStatus === 'connected' ? '✓ Connected' : 
             apiStatus === 'disconnected' ? '✗ Disconnected' : 
             '... Checking'}
          </p>
          {apiMessage && <p className="api-message">{apiMessage}</p>}
        </div>

        {showMenu ? (
          <div className="menu-full-width">
            <h2 className="menu-title">Select a Video</h2>
            <div className="video-grid">
              {VIDEOS.map(video => (
                <div 
                  key={video.id} 
                  className="video-card"
                  onClick={() => handleVideoSelect(video.id)}
                >
                  <div className="video-card-thumbnail">
                    <video
                      src={video.src}
                      preload="metadata"
                      className="thumbnail-video"
                      muted
                    />
                    <div className="play-overlay">
                      <div className="play-icon">▶</div>
                    </div>
                  </div>
                  <h3 className="video-card-title">{video.title}</h3>
                  <button className="video-card-button">Watch</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="video-layout">
            <div className="video-column">
              <div className="video-header">
                <button className="back-to-menu-button" onClick={handleBackToMenu}>
                  ← Back to Menu
                </button>
                <h2 className="video-title-header">{currentVideo?.title}</h2>
              </div>
              <VideoPlayer
                ref={videoPlayerRef}
                src={currentVideo?.src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onVideoClick={handleVideoClick}
                moments={moments}
                commentsByMomentId={commentsByMomentId}
                onSeek={handleSeek}
                onSelectMoment={handleSelectMoment}
              />
            </div>
            
            <div className="panel-column">
              {momentsLoading && <p>Loading moments...</p>}
              {momentsError && <p className="error">{momentsError}</p>}
              {!momentsLoading && !momentsError && (
                <MomentsPanel 
                  moments={moments} 
                  currentTime={currentTime}
                  displayedMoment={displayedMoment}
                  followLive={followLive}
                  onFollowLive={handleFollowLive}
                  onDisableFollowLive={handleDisableFollowLive}
                  onTimestampClick={handleTimestampClick}
                  commentsByMomentId={commentsByMomentId}
                  onAddComment={handleAddComment}
                  onSeek={handleSeek}
                  displayName={displayName}
                  onRequestName={() => setShowNamePrompt(true)}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {showNamePrompt && (
        <DisplayNamePrompt
          currentName={displayName}
          onSetName={handleSetDisplayName}
          onClose={() => {
            // Only allow closing if name is already set
            if (displayName && displayName.trim()) {
              setShowNamePrompt(false)
            }
          }}
        />
      )}
    </div>
  )
}

export default App
