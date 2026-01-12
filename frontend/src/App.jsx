import { useState, useEffect } from 'react'
import './App.css'
import { checkHealth, getRoot } from './services/api'

function App() {
  const [apiStatus, setApiStatus] = useState('checking...')
  const [apiMessage, setApiMessage] = useState('')

  useEffect(() => {
    // Check backend connection on mount
    checkHealth()
      .then((data) => {
        setApiStatus('connected')
        return getRoot()
      })
      .then((data) => {
        setApiMessage(data.message || '')
      })
      .catch((error) => {
        setApiStatus('disconnected')
        console.error('Failed to connect to backend:', error)
      })
  }, [])

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
        
        <div className="info-card">
          <h3>Welcome to ReMo</h3>
          <p>This is the frontend application for ReMo.</p>
          <p>Start building your media moments interface here.</p>
        </div>
      </main>
    </div>
  )
}

export default App
