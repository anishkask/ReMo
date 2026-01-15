import { useState } from 'react'
import { formatSecondsToTimestamp } from '../utils/time'

function AddCommentBar({ currentTime, displayName, onAddComment, onRequestName }) {
  const [commentText, setCommentText] = useState('')

  // Round current time to nearest second for placeholder
  const currentTimeRounded = Math.round(currentTime)
  const timestampLabel = formatSecondsToTimestamp(currentTimeRounded)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!commentText.trim() || !displayName) return

    // Create a moment ID based on current time (for demo, we'll use timestamp as ID)
    const momentId = `moment-${timestampLabel.replace(/:/g, '-')}`
    
    if (onAddComment) {
      onAddComment(momentId, commentText, currentTimeRounded)
      setCommentText('')
    }
  }

  if (!displayName) {
    return (
      <div className="add-comment-bar">
        <div className="name-required-message">
          <p>Set your name to comment</p>
          <button 
            type="button"
            className="set-name-button"
            onClick={onRequestName}
          >
            Set Name
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="add-comment-bar">
      <form onSubmit={handleSubmit} className="add-comment-form">
        <input
          type="text"
          placeholder={`Add a comment at ${timestampLabel}...`}
          className="add-comment-input"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
        <button 
          type="submit" 
          className="add-comment-submit" 
          disabled={!commentText.trim()}
        >
          Post
        </button>
      </form>
    </div>
  )
}

export default AddCommentBar
