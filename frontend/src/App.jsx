import { useState, useEffect } from 'react'
import './App.css'
import { checkHealth, getRoot, getMoments, addMoment } from './services/api'
import MomentsList from './components/MomentsList'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')
  const [moments, setMoments] = useState([])
  const [momentsLoading, setMomentsLoading] = useState(false)
  const [momentsError, setMomentsError] = useState(null)
  const [formTimestamp, setFormTimestamp] = useState('')
  const [formText, setFormText] = useState('')
  const [formSubmitting, setFormSubmitting] = useState(false)

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
          setMoments(momentsArray)
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formTimestamp.trim() || !formText.trim()) {
      return
    }

    setFormSubmitting(true)
    try {
      await addMoment({
        timestamp: formTimestamp.trim(),
        text: formText.trim()
      })
      // Reset form
      setFormTimestamp('')
      setFormText('')
      // Re-fetch moments
      const data = await getMoments()
      const momentsArray = Array.isArray(data?.moments) ? data.moments : []
      setMoments(momentsArray)
    } catch (error) {
      console.error('Failed to add moment:', error)
    } finally {
      setFormSubmitting(false)
    }
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
        
        <div className="add-moment-card">
          <h2>Add Moment</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="timestamp">Timestamp</label>
              <input
                id="timestamp"
                type="text"
                value={formTimestamp}
                onChange={(e) => setFormTimestamp(e.target.value)}
                placeholder="00:02:15"
                disabled={formSubmitting}
              />
            </div>
            <div className="form-group">
              <label htmlFor="text">Text</label>
              <input
                id="text"
                type="text"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Enter moment description"
                disabled={formSubmitting}
              />
            </div>
            <button type="submit" disabled={formSubmitting || !formTimestamp.trim() || !formText.trim()}>
              {formSubmitting ? 'Adding...' : 'Add Moment'}
            </button>
          </form>
        </div>

        <MomentsList 
          moments={moments}
          loading={momentsLoading}
          error={momentsError}
        />
      </main>
    </div>
  )
}

export default App
