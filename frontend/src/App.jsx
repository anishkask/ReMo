import { useState, useEffect, useRef } from 'react'
import './App.css'
import { checkHealth, getRoot, getMoments, addMoment } from './services/api'
import VideoPlayer from './components/VideoPlayer'
import MomentsPanel from './components/MomentsPanel'
import { formatCommentTime } from './utils/time'

// Available videos for demo
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
  const [commentsByVideoId, setCommentsByVideoId] = useState({})
  const videoPlayerRef = useRef(null)

  // Get current video
  const currentVideo = selectedVideoId ? VIDEOS.find(v => v.id === selectedVideoId) : null
  
  // Get moments for current video
  const moments = selectedVideoId ? (momentsByVideoId[selectedVideoId] || []) : []
  
  // Get comments for current video
  const commentsByMomentId = selectedVideoId ? (commentsByVideoId[selectedVideoId] || {}) : {}

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
      const parts = moment.timestamp.split(':').map(Number)
      let seconds = 0
      if (parts.length === 2) {
        seconds = parts[0] * 60 + parts[1]
      } else if (parts.length === 3) {
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
      }
      
      // Seek video to timestamp
      if (videoPlayerRef.current) {
        videoPlayerRef.current.seekTo(seconds)
      }
      
      // Set selected moment
      setSelectedMoment(moment)
    } else {
      // Clear selection
      setSelectedMoment(null)
    }
  }

  const handleVideoClick = (seconds) => {
    handleMarkerClick(seconds)
  }

  const handleMarkerClick = (seconds) => {
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

    // Seek video to this time
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seekTo(seconds)
    }

    // Find moment at this timestamp, or create a placeholder
    const moment = moments.find(m => m.timestamp === timestamp)
    
    if (moment) {
      // If moment exists, select it
      setSelectedMoment(moment)
    } else {
      // If no moment exists, create a temporary one for viewing
      // This allows users to click anywhere and see/add comments
      setSelectedMoment({
        id: `temp-${timestamp}`,
        timestamp: timestamp,
        text: `Moment at ${timestamp}`
      })
    }
  }

  const handleAddComment = (momentId, commentText) => {
    if (!commentText.trim() || !momentId || !selectedVideoId) return

    const newComment = {
      id: `user-${selectedVideoId}-${Date.now()}`,
      text: commentText.trim(),
      author: 'You',
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
    setCurrentTime(0)
  }

  const handleBackToMenu = () => {
    setShowMenu(true)
    setSelectedVideoId(null)
    setSelectedMoment(null)
    setCurrentTime(0)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>ReMo</h1>
        <p className="subtitle">Real-time Media Moments</p>
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
          <div className="video-menu">
            <h2>Select a Video</h2>
            <div className="video-grid">
              {VIDEOS.map(video => (
                <div 
                  key={video.id} 
                  className="video-card"
                  onClick={() => handleVideoSelect(video.id)}
                >
                  <div className="video-card-thumbnail">
                    <div className="play-icon">▶</div>
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
                onMarkerClick={handleMarkerClick}
              />
              
              {selectedMoment && (
                <div className="moment-details-panel">
                  <div className="moment-details-header">
                    <h3>Moment: {selectedMoment.timestamp}</h3>
                    <button 
                      className="close-moment-button"
                      onClick={() => setSelectedMoment(null)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="moment-details-content">
                    <p className="moment-description">{selectedMoment.text}</p>
                    <div className="comments-section">
                      <h4>Comments</h4>
                      {(() => {
                        const comments = commentsByMomentId[selectedMoment.id] || []
                        return comments.length === 0 ? (
                          <p className="empty-state">No comments yet</p>
                        ) : (
                          <div className="comments-list">
                            {comments.map((comment) => (
                              <div key={comment.id} className="comment-item">
                                <div className="comment-header">
                                  <span className="comment-author">{comment.author}</span>
                                  {comment.createdAt && (
                                    <span className="comment-time">{formatCommentTime(comment.createdAt)}</span>
                                  )}
                                </div>
                                <span className="comment-text">{comment.text}</span>
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                      <form 
                        className="add-comment-section" 
                        onSubmit={(e) => {
                          e.preventDefault()
                          const input = e.target.querySelector('.comment-input')
                          if (input && input.value.trim()) {
                            handleAddComment(selectedMoment.id, input.value)
                            input.value = ''
                          }
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          className="comment-input"
                        />
                        <button type="submit" className="comment-submit">
                          Post
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="panel-column">
              {momentsLoading && <p>Loading moments...</p>}
              {momentsError && <p className="error">{momentsError}</p>}
              {!momentsLoading && !momentsError && (
                <MomentsPanel 
                  moments={moments} 
                  currentTime={currentTime}
                  selectedMoment={selectedMoment}
                  onTimestampClick={handleTimestampClick}
                  commentsByMomentId={commentsByMomentId}
                  onAddComment={handleAddComment}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
