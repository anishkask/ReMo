import { useState, useEffect, useRef } from 'react'
import './App.css'
import { checkHealth, getRoot, getMoments, addMoment, authGoogle, getVideos, getComments, postComment, seedDatabase, deleteComment as deleteCommentAPI } from './services/api'
import VideoPlayer from './components/VideoPlayer'
import TimelineStrip from './components/TimelineStrip'
import LiveReactionsFeed from './components/LiveCommentsFeed'
import AddCommentBar from './components/AddCommentBar'
import DisplayNamePrompt from './components/DisplayNamePrompt'
import ImportVideoModal from './components/ImportVideoModal'
import GoogleAuthButton from './components/GoogleAuthButton'
import { formatCommentTime, parseTimestampToSeconds, formatSecondsToTimestamp } from './utils/time'
import { loadVideos, removeVideo, getLocalVideoFile, updateVideo } from './utils/storage'
import { loadCustomVideos, removeCustomVideo } from './utils/customVideos'
import { loadCommentsForVideo, saveComment, groupCommentsByMoment } from './utils/comments'
import VideoImportCard from './components/VideoImportCard'
import { getVersionString } from './utils/version'

// Note: Videos are now loaded from the backend API (see useEffect below)

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
  const [authUser, setAuthUser] = useState(null) // Google auth user
  const [importedVideos, setImportedVideos] = useState([])
  const [localVideoUrls, setLocalVideoUrls] = useState({}) // Map of videoId -> objectURL
  const [showImportModal, setShowImportModal] = useState(false)
  const [reconnectingVideoId, setReconnectingVideoId] = useState(null)
  const [customVideos, setCustomVideos] = useState([])
  const [apiVideos, setApiVideos] = useState([])
  const [videosLoading, setVideosLoading] = useState(false)
  const [videosError, setVideosError] = useState(null)
  const videoPlayerRef = useRef(null)

  // Load display name and auth state from localStorage on mount
  useEffect(() => {
    // Check for saved auth user first
    const savedAuthUser = localStorage.getItem('remo_auth_user')
    if (savedAuthUser) {
      try {
        setAuthUser(JSON.parse(savedAuthUser))
        const user = JSON.parse(savedAuthUser)
        // Check for custom display name first, then fall back to Google name
        const customDisplayName = localStorage.getItem('remoCustomDisplayName')
        if (customDisplayName) {
          setDisplayName(customDisplayName)
        } else if (user.name) {
          setDisplayName(user.name)
        }
      } catch (error) {
        console.error('Failed to load auth user:', error)
      }
    } else {
      // Guest mode - use regular display name
      const savedName = localStorage.getItem('remoDisplayName')
      if (savedName) {
        setDisplayName(savedName)
      }
    }
  }, [])

  // Load imported videos and hydrate local video URLs
  useEffect(() => {
    const loadImportedVideos = async () => {
      const videos = loadVideos()
      setImportedVideos(videos)

      // Hydrate local video URLs from IndexedDB
      const urlMap = {}
      for (const video of videos) {
        if (video.sourceType === 'local' && video.localKey) {
          try {
            const file = await getLocalVideoFile(video.localKey)
            if (file) {
              urlMap[video.id] = URL.createObjectURL(file)
            }
          } catch (error) {
            console.warn(`Failed to load local video ${video.id}:`, error)
          }
        }
      }
      setLocalVideoUrls(urlMap)
    }

    loadImportedVideos()
  }, [])

  // Load custom videos (URL imports) on mount
  useEffect(() => {
    const videos = loadCustomVideos()
    setCustomVideos(videos)
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(localVideoUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url)
      })
    }
  }, [localVideoUrls])

  // Handle "Continue as guest" - show display name prompt
  const handleContinueAsGuest = () => {
    const savedName = localStorage.getItem('remoDisplayName')
    if (savedName) {
      setDisplayName(savedName)
    } else {
      setShowNamePrompt(true)
    }
  }

  // Handle Google Sign-In
  const handleGoogleSignIn = async (idToken) => {
    try {
      const response = await authGoogle(idToken)
      
      // Store access token and user
      localStorage.setItem('remo_access_token', response.access_token)
      localStorage.setItem('remo_auth_user', JSON.stringify(response.user))
      
      // Update state
      setAuthUser(response.user)
      // Check for custom display name first, then use Google name
      const customDisplayName = localStorage.getItem('remoCustomDisplayName')
      if (customDisplayName) {
        setDisplayName(customDisplayName)
      } else {
        setDisplayName(response.user.name || response.user.email)
      }
      
      return true
    } catch (error) {
      console.error('Google sign in failed:', error)
      throw error
    }
  }

  // Handle Google Sign-Out
  const handleGoogleSignOut = () => {
    localStorage.removeItem('remo_access_token')
    localStorage.removeItem('remo_auth_user')
    setAuthUser(null)
    
    // Clear custom display name when signing out
    localStorage.removeItem('remoCustomDisplayName')
    
    // Fall back to guest mode if display name exists
    const savedName = localStorage.getItem('remoDisplayName')
    if (savedName) {
      setDisplayName(savedName)
    } else {
      setDisplayName('')
    }
  }

  // Save display name to localStorage when it changes
  const handleSetDisplayName = (name) => {
    setDisplayName(name)
    // Store in different keys based on auth status
    if (authUser) {
      localStorage.setItem('remoCustomDisplayName', name)
    } else {
      localStorage.setItem('remoDisplayName', name)
      // Clear custom display name if switching to guest
      localStorage.removeItem('remoCustomDisplayName')
    }
    setShowNamePrompt(false)
  }

  // Handle guest sign out - clear display name and return to home
  const handleGuestSignOut = () => {
    setDisplayName('')
    localStorage.removeItem('remoDisplayName')
    setSelectedVideoId(null)
    setShowMenu(true)
    setSelectedMoment(null)
    setFollowLive(true)
    setCurrentTime(0)
  }

  // Merge API videos with imported videos and custom videos
  const allVideos = [
    ...apiVideos.map(v => ({ 
      ...v, 
      sourceType: 'api', 
      src: v.video_url,
      title: v.title
    })),
    ...importedVideos.map(v => ({
      ...v,
      src: v.sourceType === 'local' 
        ? localVideoUrls[v.id] || null
        : v.url || null
    })),
    ...customVideos.map(v => ({
      ...v,
      src: v.url,
      sourceType: 'custom'
    }))
  ]

  // Get current video
  const currentVideo = selectedVideoId 
    ? allVideos.find(v => v.id === selectedVideoId) 
    : null
  
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

  // Load videos from API when backend is connected
  useEffect(() => {
    if (apiStatus === 'connected') {
      setVideosLoading(true)
      setVideosError(null)
      
      getVideos()
        .then((videos) => {
          // If no videos, seed the database
          if (videos.length === 0) {
            return seedDatabase().then(() => getVideos())
          }
          return videos
        })
        .then((videos) => {
          setApiVideos(videos)
          setVideosLoading(false)
        })
        .catch((error) => {
          console.error('Failed to load videos:', error)
          setVideosError('Failed to load videos from backend')
          setVideosLoading(false)
        })
    }
  }, [apiStatus])

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
          
          // Initialize moments for all videos (API + imported + custom)
          const allVideoIds = [
            ...apiVideos.map(v => v.id),
            ...importedVideos.map(v => v.id),
            ...customVideos.map(v => v.id)
          ]
          
          allVideoIds.forEach(videoId => {
            // Start with backend moments
            const videoMoments = [...momentsArray]
            
            // Load persisted comments from localStorage
            const storedComments = loadCommentsForVideo(videoId)
            
            // Find unique timestamps from stored comments that don't have moments
            const timestampsNeedingMoments = new Set()
            storedComments.forEach(storedComment => {
              const existingMoment = momentsArray.find(m => m.timestamp === storedComment.timestampLabel)
              if (!existingMoment) {
                timestampsNeedingMoments.add(storedComment.timestampLabel)
              }
            })
            
            // Create moments for timestamps that need them
            timestampsNeedingMoments.forEach(timestampLabel => {
              const newMoment = {
                id: `moment-${videoId}-${timestampLabel.replace(/:/g, '-')}`,
                timestamp: timestampLabel,
                text: `Moment at ${timestampLabel}`
              }
              videoMoments.push(newMoment)
            })
            
            momentsForAllVideos[videoId] = videoMoments
            
            // Load seeded comments
            const seededComments = initializeSeededComments(videoMoments, videoId)
            
            // Group stored comments by moment (using all moments including newly created ones)
            const storedCommentsGrouped = groupCommentsByMoment(storedComments, videoMoments)
            
            // Merge seeded and stored comments
            const mergedComments = { ...seededComments }
            
            // Add stored comments, merging with seeded if moment exists
            Object.keys(storedCommentsGrouped).forEach(momentId => {
              if (mergedComments[momentId]) {
                // Merge arrays, avoiding duplicates by id
                const existingIds = new Set(mergedComments[momentId].map(c => c.id))
                const newComments = storedCommentsGrouped[momentId].filter(c => !existingIds.has(c.id))
                mergedComments[momentId] = [...mergedComments[momentId], ...newComments]
              } else {
                mergedComments[momentId] = storedCommentsGrouped[momentId]
              }
            })
            
            commentsForAllVideos[videoId] = mergedComments
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
  }, [apiStatus, importedVideos, customVideos, apiVideos])

  // Helper function to fetch and process comments for a video
  const fetchCommentsForVideo = async (videoId, abortSignal = null) => {
    const currentVideo = allVideos.find(v => v.id === videoId)
    const isApiVideo = currentVideo?.sourceType === 'api'

    if (isApiVideo && apiStatus === 'connected') {
      try {
        console.log('Fetching comments for', videoId)
        const backendComments = await getComments(videoId)
        console.log(`Loaded ${backendComments.length} comments from backend for video ${videoId}`)
        
        // Get moments for this video (read from current state, not dependency)
        const videoMoments = momentsByVideoId[videoId] || []
        
        // Convert backend comment format to frontend format
        const convertedComments = backendComments.map(comment => ({
          id: comment.id,
          text: comment.body,
          author: comment.author_name || 'Anonymous',
          authorId: comment.author_id || null,
          createdAt: comment.created_at,
          timestampSeconds: comment.timestamp_seconds || 0
        }))

        // Group comments by moment
        const commentsByMoment = groupCommentsByMoment(
          convertedComments.map(c => ({
            id: c.id,
            timestampSeconds: c.timestampSeconds,
            timestampLabel: formatSecondsToTimestamp(c.timestampSeconds),
            text: c.text,
            displayName: c.author,
            createdAtISO: c.createdAt,
            authorId: c.authorId
          })),
          videoMoments
        )

        // Update state only if not aborted
        if (!abortSignal?.aborted) {
          setCommentsByVideoId(prev => ({
            ...prev,
            [videoId]: commentsByMoment
          }))
        }
      } catch (error) {
        if (abortSignal?.aborted) {
          console.log('Comment fetch cancelled for', videoId)
          return
        }
        console.error('Failed to load comments from backend:', error)
        // For API videos, don't fall back to localStorage - comments must come from backend
        // Set empty comments to show no comments state
        setCommentsByVideoId(prev => ({
          ...prev,
          [videoId]: {}
        }))
      }
    } else if (!isApiVideo) {
      // For non-API videos, load from localStorage
      const storedComments = loadCommentsForVideo(videoId)
      if (storedComments.length > 0) {
        const videoMoments = momentsByVideoId[videoId] || []
        const grouped = groupCommentsByMoment(storedComments, videoMoments)
        setCommentsByVideoId(prev => ({
          ...prev,
          [videoId]: grouped
        }))
      }
    }
  }

  // Ref to track in-flight comment fetch to prevent overlapping requests
  const commentsFetchRef = useRef(null)

  // Load comments from backend when video is selected (for API videos)
  // CRITICAL: Only depend on videoId and apiStatus - NOT on momentsByVideoId or allVideos
  useEffect(() => {
    if (!selectedVideoId || apiStatus !== 'connected') return

    // AbortController to cancel in-flight requests
    const abortController = new AbortController()
    commentsFetchRef.current = abortController

    const loadComments = async () => {
      // Guard: if there's already a fetch in progress for a different video, abort it
      if (commentsFetchRef.current && commentsFetchRef.current !== abortController) {
        commentsFetchRef.current.abort()
      }

      try {
        await fetchCommentsForVideo(selectedVideoId, abortController.signal)
      } catch (error) {
        // Ignore abort errors
        if (error.name !== 'AbortError' && !abortController.signal.aborted) {
          console.error('Error loading comments:', error)
        }
      } finally {
        // Clear ref if this is still the current fetch
        if (commentsFetchRef.current === abortController) {
          commentsFetchRef.current = null
        }
      }
    }

    loadComments()

    // Cleanup: abort request if videoId changes or component unmounts
    return () => {
      abortController.abort()
      if (commentsFetchRef.current === abortController) {
        commentsFetchRef.current = null
      }
    }
  }, [selectedVideoId, apiStatus]) // ONLY these two dependencies

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

  const handleAddComment = async (momentId, commentText, timestampSeconds) => {
    if (!commentText.trim() || !selectedVideoId) return
    
    // Use custom display name if set, otherwise use auth user name or guest display name
    const authorName = displayName || (authUser 
      ? (authUser.name || authUser.email || 'User')
      : null)
    
    if (!authorName) return

    // Format timestamp
    const timestamp = formatSecondsToTimestamp(timestampSeconds)
    
    // Find or create moment for this timestamp
    let targetMoment = moments.find(m => m.timestamp === timestamp)
    
    if (!targetMoment) {
      // Create a new moment for this timestamp
      targetMoment = {
        id: `moment-${selectedVideoId}-${timestamp.replace(/:/g, '-')}`,
        timestamp: timestamp,
        text: `Moment at ${timestamp}`
      }
      
      // Add to moments
      setMomentsByVideoId(prev => ({
        ...prev,
        [selectedVideoId]: [...(prev[selectedVideoId] || []), targetMoment]
      }))
    }

    // Check if this is an API video
    const currentVideo = allVideos.find(v => v.id === selectedVideoId)
    const isApiVideo = currentVideo?.sourceType === 'api'

    // Save to backend API if API video
    if (isApiVideo && apiStatus === 'connected') {
      try {
        const savedComment = await postComment(selectedVideoId, {
          author_name: authorName,
          author_id: authUser?.id || null,
          timestamp_seconds: timestampSeconds,
          body: commentText.trim()
        })
        console.log('Comment saved to backend:', savedComment)
        
        // Optimistically add comment to UI immediately
        const optimisticComment = {
          id: savedComment.id,
          text: savedComment.body,
          author: savedComment.author_name || authorName,
          authorId: savedComment.author_id || null,
          createdAt: savedComment.created_at,
          timestampSeconds: savedComment.timestamp_seconds || timestampSeconds
        }
        
        // Update state optimistically
        setCommentsByVideoId(prev => {
          const current = prev[selectedVideoId] || {}
          const momentComments = current[targetMoment.id] || []
          
          // Check if comment already exists (avoid duplicates)
          const existingIndex = momentComments.findIndex(c => c.id === optimisticComment.id)
          let updatedMomentComments
          if (existingIndex >= 0) {
            updatedMomentComments = [...momentComments]
            updatedMomentComments[existingIndex] = optimisticComment
          } else {
            updatedMomentComments = [...momentComments, optimisticComment]
          }
          
          return {
            ...prev,
            [selectedVideoId]: {
              ...current,
              [targetMoment.id]: updatedMomentComments
            }
          }
        })
        
        // Re-fetch all comments from backend to ensure consistency
        // Call fetchCommentsForVideo directly (no useEffect trigger)
        try {
          await fetchCommentsForVideo(selectedVideoId)
        } catch (fetchError) {
          console.error('Failed to re-fetch comments after post:', fetchError)
          // Optimistic update already applied, so UI is correct
        }
      } catch (error) {
        console.error('Failed to save comment to API:', error)
        // Show error message to user
        alert(`Failed to save comment: ${error.message || 'Unknown error'}. Please try again.`)
        // Don't save to localStorage - comments must come from backend for API videos
      }
    } else {
      // For non-API videos, save to localStorage
      const commentId = crypto.randomUUID ? crypto.randomUUID() : `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const createdAtISO = new Date().toISOString()
      const newComment = {
        id: commentId,
        text: commentText.trim(),
        author: authorName,
        createdAt: createdAtISO
      }
      
      // Update React state
      setCommentsByVideoId(prev => ({
        ...prev,
        [selectedVideoId]: {
          ...(prev[selectedVideoId] || {}),
          [targetMoment.id]: [...((prev[selectedVideoId] || {})[targetMoment.id] || []), newComment]
        }
      }))
      
      // Persist to localStorage
      const commentToStore = {
        id: commentId,
        timestampSeconds: timestampSeconds,
        timestampLabel: timestamp,
        text: commentText.trim(),
        displayName: authorName,
        createdAtISO: createdAtISO
      }
      saveComment(selectedVideoId, commentToStore)
    }
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

  const handleDeleteComment = async (commentId, momentId) => {
    if (!selectedVideoId || !commentId) return
    
    const currentVideo = allVideos.find(v => v.id === selectedVideoId)
    const isApiVideo = currentVideo?.sourceType === 'api'
    
    if (!isApiVideo) {
      // For non-API videos, deletion not supported (localStorage only)
      return
    }
    
    // Get comment to check authorization
    const comments = commentsByVideoId[selectedVideoId] || {}
    const momentComments = comments[momentId] || []
    const comment = momentComments.find(c => c.id === commentId)
    
    if (!comment) return
    
    // Check if user can delete (must be authenticated and author_id matches)
    const currentUserId = authUser?.id || null
    if (!currentUserId || comment.authorId !== currentUserId) {
      alert('You can only delete your own comments')
      return
    }
    
    // Confirm deletion
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return
    }
    
    try {
      // Delete from backend (endpoint: DELETE /videos/{video_id}/comments/{comment_id})
      await deleteCommentAPI(selectedVideoId, commentId, currentUserId)
      
      // Re-fetch comments to ensure consistency
      // Call fetchCommentsForVideo directly (no useEffect trigger)
      await fetchCommentsForVideo(selectedVideoId)
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert(`Failed to delete comment: ${error.message || 'Unknown error'}`)
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

  const handleVideoAdded = async (newVideo) => {
    // Reload imported videos
    const videos = loadVideos()
    setImportedVideos(videos)

    // If local video, create object URL
    if (newVideo.sourceType === 'local' && newVideo.file) {
      const objectURL = URL.createObjectURL(newVideo.file)
      setLocalVideoUrls(prev => ({
        ...prev,
        [newVideo.id]: objectURL
      }))
    }
  }

  const handleRemoveVideo = async (videoId, e) => {
    e.stopPropagation() // Prevent video selection
    
    if (!window.confirm('Are you sure you want to remove this video?')) {
      return
    }

    try {
      // Check if it's a custom video
      const isCustom = customVideos.some(v => v.id === videoId)
      
      if (isCustom) {
        // Remove custom video
        removeCustomVideo(videoId)
        setCustomVideos(prev => prev.filter(v => v.id !== videoId))
      } else {
        // Remove imported video (local/remote)
        await removeVideo(videoId)
        setImportedVideos(prev => prev.filter(v => v.id !== videoId))
        
        // Revoke object URL if local
        if (localVideoUrls[videoId]) {
          URL.revokeObjectURL(localVideoUrls[videoId])
          setLocalVideoUrls(prev => {
            const updated = { ...prev }
            delete updated[videoId]
            return updated
          })
        }
      }

      // If this video was selected, go back to menu
      if (selectedVideoId === videoId) {
        handleBackToMenu()
      }
    } catch (error) {
      console.error('Error removing video:', error)
      alert('Failed to remove video')
    }
  }

  const handleCustomVideoAdded = (video) => {
    // Reload custom videos
    const videos = loadCustomVideos()
    setCustomVideos(videos)
  }

  const handleReconnectLocalFile = async (videoId, e) => {
    e.stopPropagation() // Prevent video selection
    
    setReconnectingVideoId(videoId)
    
    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/mp4,video/webm,video/quicktime'
    
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) {
        setReconnectingVideoId(null)
        return
      }

      try {
        // Update video with new file
        await updateVideo(videoId, { file })
        
        // Create new object URL
        const objectURL = URL.revokeObjectURL(localVideoUrls[videoId])
        const newObjectURL = URL.createObjectURL(file)
        
        setLocalVideoUrls(prev => ({
          ...prev,
          [videoId]: newObjectURL
        }))

        // Reload imported videos
        const videos = loadVideos()
        setImportedVideos(videos)
        
        setReconnectingVideoId(null)
      } catch (error) {
        console.error('Error reconnecting file:', error)
        alert('Failed to reconnect file')
        setReconnectingVideoId(null)
      }
    }
    
    input.click()
  }

  return (
    <div className={`app ${showMenu ? 'menu-mode' : ''}`}>
      <header className="app-header">
        <div className="header-content">
          <div onClick={handleBackToMenu} style={{ cursor: 'pointer' }}>
            <h1>ReMo</h1>
            <p className="subtitle">Real-time Media Moments</p>
            <span className="version-marker" title={`Build: ${getVersionString()}`}>
              {getVersionString()}
            </span>
          </div>
          <div className="header-auth-section">
            {authUser ? (
              <div className="google-auth-with-display-name">
                <GoogleAuthButton
                  onSignIn={handleGoogleSignIn}
                  onSignOut={handleGoogleSignOut}
                  isSignedIn={true}
                  user={authUser}
                />
                <div className="display-name-indicator google-display-name">
                  <span className="name-label">Display:</span>
                  <span className="name-value">{displayName}</span>
                  <button 
                    className="change-name-button"
                    onClick={() => setShowNamePrompt(true)}
                    title="Change display name"
                  >
                    ✎
                  </button>
                </div>
              </div>
            ) : displayName ? (
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
                <button 
                  className="guest-sign-out-button"
                  onClick={handleGuestSignOut}
                  title="Sign out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <GoogleAuthButton
                  onSignIn={handleGoogleSignIn}
                  onSignOut={handleGoogleSignOut}
                  isSignedIn={false}
                />
                <button 
                  className="auth-button guest-button"
                  onClick={handleContinueAsGuest}
                >
                  Continue as Guest
                </button>
              </div>
            )}
          </div>
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
              {/* Video cards */}
              {allVideos.map(video => {
                const isLocal = video.sourceType === 'local'
                const isRemote = video.sourceType === 'remote'
                const isCustom = video.sourceType === 'custom'
                const isImported = isLocal || isRemote || isCustom
                const hasFile = isLocal && localVideoUrls[video.id]
                const missingFile = isLocal && !localVideoUrls[video.id]

                return (
                  <div 
                    key={video.id} 
                    className={`video-card ${missingFile ? 'video-card-missing' : ''}`}
                    onClick={() => {
                      if (!missingFile) {
                        handleVideoSelect(video.id)
                      }
                    }}
                  >
                    <div className="video-card-thumbnail">
                      {missingFile ? (
                        <div className="video-card-placeholder">
                          <div className="placeholder-icon">⚠</div>
                          <p>File Missing</p>
                        </div>
                      ) : video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="thumbnail-image"
                        />
                      ) : (
                        <video
                          src={video.src}
                          preload="metadata"
                          className="thumbnail-video"
                          muted
                        />
                      )}
                      {!missingFile && (
                        <div className="play-overlay">
                          <div className="play-icon">▶</div>
                        </div>
                      )}
                    </div>
                    <div className="video-card-badges">
                      {isImported && (
                        <span className={`video-badge ${isLocal ? 'badge-local' : isCustom ? 'badge-custom' : 'badge-remote'}`}>
                          {isLocal ? 'Local' : isCustom ? 'Custom' : 'URL'}
                        </span>
                      )}
                    </div>
                    <h3 className="video-card-title">{video.title}</h3>
                    <div className="video-card-actions">
                      {missingFile ? (
                        <button 
                          className="video-card-reconnect"
                          onClick={(e) => handleReconnectLocalFile(video.id, e)}
                          disabled={reconnectingVideoId === video.id}
                        >
                          {reconnectingVideoId === video.id ? 'Reconnecting...' : 'Reconnect'}
                        </button>
                      ) : (
                        <button 
                          className="video-card-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleVideoSelect(video.id)
                          }}
                        >
                          Watch
                        </button>
                      )}
                      {isImported && (
                        <button
                          className="video-card-remove"
                          onClick={(e) => handleRemoveVideo(video.id, e)}
                          title="Remove video"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Inline import row */}
            <VideoImportCard onVideoAdded={handleCustomVideoAdded} />
          </div>
        ) : (
          <div className="watch-page-container">
            <div className="watch-page-header">
              <h2 className="watch-page-title">{currentVideo?.title}</h2>
            </div>
            
            <div className="watch-page-content">
              {/* Video */}
              <div className="watch-video-section">
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
              
              {/* Timeline Strip */}
              <div className="watch-timeline-section">
                <TimelineStrip
                  duration={duration}
                  currentTime={currentTime}
                  moments={moments}
                  commentsByMomentId={commentsByMomentId}
                  onSeek={handleSeek}
                  onMarkerClick={handleSelectMoment}
                />
              </div>
              
              {/* Live Reactions Feed */}
              <div className="watch-feed-section">
                <LiveReactionsFeed
                  moments={moments}
                  commentsByMomentId={commentsByMomentId}
                  currentTime={currentTime}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={authUser?.id || null}
                />
              </div>
              
              {/* Add Comment Bar */}
              <div className="watch-comment-bar-section">
                <AddCommentBar
                  currentTime={currentTime}
                  displayName={authUser ? (authUser.name || authUser.email || 'User') : displayName}
                  onAddComment={handleAddComment}
                  onRequestName={() => {
                    if (!authUser) {
                      handleContinueAsGuest()
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {showNamePrompt && (
        <DisplayNamePrompt
          currentName={displayName}
          onSetName={handleSetDisplayName}
          onClose={() => {
            // Allow closing - user can set name later or sign in with Google
            setShowNamePrompt(false)
          }}
          isGoogleUser={!!authUser}
        />
      )}

      {showImportModal && (
        <ImportVideoModal
          onClose={() => setShowImportModal(false)}
          onVideoAdded={handleVideoAdded}
        />
      )}
      </div>
  )
}

export default App
