import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Normalize URL to prevent Google OAuth issues
// Google OAuth requires exact origin match - ensure URL is normalized
// Force removal of trailing slash from root URL using replace (not replaceState)
// This ensures the browser URL bar and all location properties are updated
(function normalizeUrl() {
  const currentHref = window.location.href
  const isRoot = window.location.pathname === '/' || window.location.pathname === ''
  
  if (isRoot && currentHref.endsWith('/') && !currentHref.endsWith('://')) {
    // Construct clean URL without trailing slash
    const cleanUrl = window.location.origin + window.location.search + window.location.hash
    // Use replace() instead of replaceState() to force browser to update URL bar
    if (cleanUrl !== currentHref) {
      window.location.replace(cleanUrl)
      return // Exit early - page will reload
    }
  } else if (!isRoot && window.location.pathname.endsWith('/')) {
    // Remove trailing slash from non-root paths
    const normalizedPath = window.location.pathname.replace(/\/+$/, '')
    const cleanUrl = window.location.origin + normalizedPath + window.location.search + window.location.hash
    if (cleanUrl !== currentHref) {
      window.location.replace(cleanUrl)
      return // Exit early - page will reload
    }
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
