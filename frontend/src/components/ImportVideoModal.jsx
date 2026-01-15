import { useState } from 'react'
import { generateThumbnailFromFile, generateThumbnailFromURL, getPlaceholderThumbnail } from '../utils/thumbnail'
import { addVideo } from '../utils/storage'

function ImportVideoModal({ onClose, onVideoAdded }) {
  const [activeTab, setActiveTab] = useState('file') // 'file' or 'url'
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime']
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select an MP4 or WebM video file')
      return
    }

    setFile(selectedFile)
    setError('')
    
    // Auto-fill title from filename
    if (!title) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '')
      setTitle(nameWithoutExt)
    }
  }

  const handleUrlChange = (e) => {
    const inputUrl = e.target.value
    setUrl(inputUrl)
    setError('')
    
    // Auto-fill title from hostname if empty
    if (!title && inputUrl) {
      try {
        const urlObj = new URL(inputUrl)
        const hostname = urlObj.hostname.replace('www.', '')
        setTitle(hostname)
      } catch {
        // Invalid URL, ignore
      }
    }
  }

  const validateUrl = (urlString) => {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let videoUrl = null
      let thumbnail = null
      let videoId = null
      let sourceType = null
      let fileToStore = null

      if (activeTab === 'file') {
        if (!file) {
          setError('Please select a video file')
          setLoading(false)
          return
        }

        sourceType = 'local'
        videoId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        fileToStore = file

        // Generate thumbnail
        try {
          thumbnail = await generateThumbnailFromFile(file)
        } catch (thumbError) {
          console.warn('Thumbnail generation failed:', thumbError)
          thumbnail = getPlaceholderThumbnail()
        }
      } else {
        // URL import
        if (!url.trim()) {
          setError('Please enter a video URL')
          setLoading(false)
          return
        }

        if (!validateUrl(url)) {
          setError('Please enter a valid HTTP/HTTPS URL')
          setLoading(false)
          return
        }

        // Check if URL ends with video extension
        const videoExtensions = ['.mp4', '.webm', '.mov']
        const hasVideoExt = videoExtensions.some(ext => url.toLowerCase().endsWith(ext))
        
        if (!hasVideoExt) {
          setError('URL must point to a video file (.mp4, .webm, or .mov)')
          setLoading(false)
          return
        }

        sourceType = 'remote'
        videoId = `remote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        videoUrl = url.trim()

        // Generate thumbnail
        try {
          thumbnail = await generateThumbnailFromURL(videoUrl)
        } catch (thumbError) {
          console.warn('Thumbnail generation failed:', thumbError)
          thumbnail = getPlaceholderThumbnail()
        }
      }

      if (!title.trim()) {
        setError('Please enter a title')
        setLoading(false)
        return
      }

      // Create video object
      const video = {
        id: videoId,
        title: title.trim(),
        sourceType,
        url: videoUrl || undefined,
        localKey: sourceType === 'local' ? videoId : undefined,
        thumbnail,
        createdAt: Date.now()
      }

      // Add file to video object for storage
      if (fileToStore) {
        video.file = fileToStore
      }

      // Save to storage
      await addVideo(video)

      // Notify parent
      if (onVideoAdded) {
        onVideoAdded(video)
      }

      // Close modal
      onClose()
    } catch (err) {
      console.error('Error importing video:', err)
      setError('Failed to import video. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="import-modal-overlay" onClick={onClose}>
      <div className="import-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="import-modal-header">
          <h2>Import Video</h2>
          <button className="import-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="import-modal-tabs">
          <button
            className={`import-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('file')
              setError('')
            }}
          >
            Upload File
          </button>
          <button
            className={`import-tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('url')
              setError('')
            }}
          >
            Import by URL
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="import-form-group">
            <label htmlFor="video-title">Title</label>
            <input
              id="video-title"
              type="text"
              className="import-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title..."
              required
            />
          </div>

          {activeTab === 'file' ? (
            <div className="import-form-group">
              <label htmlFor="video-file">Video File (MP4, WebM)</label>
              <input
                id="video-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="import-file-input"
                required
              />
              {file && (
                <p className="import-file-name">{file.name}</p>
              )}
            </div>
          ) : (
            <div className="import-form-group">
              <label htmlFor="video-url">Video URL</label>
              <input
                id="video-url"
                type="url"
                className="import-input"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://example.com/video.mp4"
                required
              />
            </div>
          )}

          {error && (
            <div className="import-error">{error}</div>
          )}

          <div className="import-form-actions">
            <button
              type="button"
              className="import-cancel-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="import-submit-button"
              disabled={loading}
            >
              {loading ? 'Importing...' : 'Import Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ImportVideoModal
