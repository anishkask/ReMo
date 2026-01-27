import { useState, useEffect } from 'react'

function DisplayNamePrompt({ currentName, onSetName, onClose }) {
  const [inputName, setInputName] = useState(currentName || '')
  const [error, setError] = useState('')

  useEffect(() => {
    // Focus input on mount
    const input = document.getElementById('display-name-input')
    if (input) {
      input.focus()
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmedName = inputName.trim()
    
    if (!trimmedName) {
      setError('Please enter a name')
      return
    }
    
    if (trimmedName.length > 30) {
      setError('Name must be 30 characters or less')
      return
    }

    onSetName(trimmedName)
    if (onClose) {
      onClose()
    }
  }

  return (
    <div 
      className="display-name-prompt-overlay" 
      onClick={onClose}
    >
      <div className="display-name-prompt-card" onClick={(e) => e.stopPropagation()}>
        <h3>Set Your Display Name</h3>
        <p className="prompt-description">
          Choose a name to appear on your comments, or sign in with Google for a better experience.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            id="display-name-input"
            type="text"
            placeholder="Enter your name..."
            className="display-name-input"
            value={inputName}
            onChange={(e) => {
              setInputName(e.target.value)
              setError('')
            }}
            maxLength={30}
          />
          {error && <p className="prompt-error">{error}</p>}
          <div className="prompt-actions">
            <button type="submit" className="prompt-submit">
              {currentName ? 'Update Name' : 'Set Name'}
            </button>
            <button type="button" className="prompt-cancel" onClick={onClose}>
              {currentName ? 'Cancel' : 'Skip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DisplayNamePrompt
