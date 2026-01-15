import { useState } from 'react'
import { validateMP4Url, generateTitleFromUrl, addCustomVideo } from '../utils/customVideos'

function VideoImportCard({ onVideoAdded }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUrlChange = (e) => {
    const inputUrl = e.target.value
    setUrl(inputUrl)
    setError('')

    // Auto-generate title if empty
    if (!title && inputUrl) {
      const validation = validateMP4Url(inputUrl)
      if (validation.valid) {
        setTitle(generateTitleFromUrl(inputUrl))
      }
    }
  }

  const handleTitleChange = (e) => {
    setTitle(e.target.value)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate URL
    const validation = validateMP4Url(url)
    if (!validation.valid) {
      setError(validation.error)
      setLoading(false)
      return
    }

    // Validate title
    if (!title.trim()) {
      setError('Please enter a title')
      setLoading(false)
      return
    }

    // Create video object
    const video = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      url: url.trim(),
      source: 'custom'
    }

    // Save to localStorage
    try {
      addCustomVideo(video)
      
      // Notify parent
      if (onVideoAdded) {
        onVideoAdded(video)
      }

      // Reset form
      setUrl('')
      setTitle('')
      setError('')
    } catch (err) {
      console.error('Error adding custom video:', err)
      setError('Failed to add video. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="video-import-row">
      <form onSubmit={handleSubmit} className="import-row-form">
        <div className="import-row-label-section">
          <label htmlFor="import-url" className="import-row-label">
            Import video by URL
          </label>
          <span className="import-row-helper">Public .mp4 URL</span>
        </div>

        <div className="import-row-inputs">
          <input
            id="import-url"
            type="url"
            className="import-row-url-input"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://example.com/video.mp4"
            disabled={loading}
            required
          />
          <input
            id="import-title"
            type="text"
            className="import-row-title-input"
            value={title}
            onChange={handleTitleChange}
            placeholder="Title (optional)"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="import-row-submit"
          disabled={loading || !url.trim()}
        >
          {loading ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && (
        <div className="import-row-error">{error}</div>
      )}
    </div>
  )
}

export default VideoImportCard
