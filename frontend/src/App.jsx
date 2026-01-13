import { useState, useEffect } from 'react'
import './App.css'
import { checkHealth, getRoot, getMoments } from './services/api'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')
  const [moments, setMoments] = useState([])
  const [momentsLoading, setMomentsLoading] = useState(false)
  const [momentsError, setMomentsError] = useState(null)

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

  // Always ensure moments is an array
  const safeMoments = Array.isArray(moments) ? moments : []

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
        
        <div className="moments-card">
          <h2>Moments</h2>
          {momentsLoading && <p>Loading moments...</p>}
          {momentsError && <p className="error">{momentsError}</p>}
          {!momentsLoading && !momentsError && safeMoments.length === 0 && (
            <p>No moments found</p>
          )}
          {!momentsLoading && !momentsError && safeMoments.length > 0 && (
            <div className="moments-list">
              {safeMoments.map((moment) => {
                // Guard against undefined/null moment
                if (!moment || typeof moment.id === 'undefined') {
                  return null
                }
                return (
                  <div key={moment.id} className="moment-item">
                    <span className="moment-timestamp">{moment.timestamp || ''}</span>
                    <span className="moment-text">{moment.text || ''}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
