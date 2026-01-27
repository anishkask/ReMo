import { useEffect, useRef } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/**
 * GoogleAuthButton component using Google Identity Services
 */
function GoogleAuthButton({ onSignIn, onSignOut, isSignedIn, user }) {
  const buttonRef = useRef(null)
  const scriptLoaded = useRef(false)
  const initialized = useRef(false)

  // DEBUG: Log origin and client ID once on mount
  useEffect(() => {
    console.log('=== Google OAuth Debug ===')
    console.log('origin:', window.location.origin)
    console.log('href:', window.location.href)
    console.log('pathname:', window.location.pathname)
    console.log('protocol:', window.location.protocol)
    console.log('host:', window.location.host)
    console.log('hostname:', window.location.hostname)
    console.log('port:', window.location.port)
    console.log('clientId (env):', GOOGLE_CLIENT_ID)
    console.log('document.referrer:', document.referrer)
    console.log('========================')
    
    // Verify origin matches expected value
    const expectedOrigin = 'http://localhost:5176'
    if (window.location.origin !== expectedOrigin) {
      console.error(`Origin mismatch! Expected: ${expectedOrigin}, Got: ${window.location.origin}`)
    }
    
    // Note: window.location.href may show trailing slash for root path, but origin is correct
    // Google OAuth checks window.location.origin, not href, so this should be fine
    if (window.location.origin !== expectedOrigin) {
      console.error('⚠️ CRITICAL: Origin does not match expected value!')
      console.error('Make sure http://localhost:5176 (without trailing slash) is configured in Google Cloud Console')
    }
  }, [])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID not configured')
      return
    }

    // Load Google Identity Services script
    if (!scriptLoaded.current) {
      console.log('Loading Google Identity Services script...')
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        console.log('Google Identity Services script loaded')
        scriptLoaded.current = true
        
        // Check if Google API is available
        const checkGoogleAPI = () => {
          if (typeof window.google !== 'undefined' && window.google.accounts) {
            console.log('Google API is available, initializing...')
            initializeGoogleSignIn()
          } else {
            console.warn('Google API not yet available, retrying...')
            setTimeout(checkGoogleAPI, 100)
          }
        }
        
        // Wait a bit for the API to be fully ready
        setTimeout(checkGoogleAPI, 200)
      }
      script.onerror = (error) => {
        console.error('Failed to load Google Identity Services script:', error)
      }
      document.head.appendChild(script)

      return () => {
        // Cleanup on unmount
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }
    } else {
      initializeGoogleSignIn()
    }
  }, [isSignedIn])

  const initializeGoogleSignIn = () => {
    console.log('initializeGoogleSignIn called', {
      googleDefined: typeof window.google !== 'undefined',
      accountsDefined: typeof window.google?.accounts !== 'undefined',
      isSignedIn,
      hasButtonRef: !!buttonRef.current,
      alreadyInitialized: initialized.current
    })
    
    if (typeof window.google === 'undefined' || !window.google.accounts) {
      console.warn('Google Identity Services not loaded yet', {
        google: typeof window.google,
        accounts: typeof window.google?.accounts
      })
      return
    }

    if (!isSignedIn && buttonRef.current && !initialized.current) {
      // Clear any existing button first
      buttonRef.current.innerHTML = ''
      
      // DEBUG: Log the exact values being sent to Google at initialize time
      console.log('=== Google Initialize Debug ===')
      console.log('origin at initialize:', window.location.origin)
      console.log('clientId at initialize:', GOOGLE_CLIENT_ID)
      console.log('document.referrer:', document.referrer)
      console.log('================================')

      try {
        // Initialize Google Sign In button (only once)
        if (!initialized.current) {
          // Double-check origin before initializing
          const currentOrigin = window.location.origin
          const currentHref = window.location.href
          const expectedOrigin = 'http://localhost:5176'
          
          if (currentOrigin !== expectedOrigin) {
            console.error(`Origin mismatch detected! Expected: ${expectedOrigin}, Got: ${currentOrigin}`)
            return
          }
          
          // Normalize origin - ensure no trailing slash issues
          // window.location.origin should already be correct (protocol://host:port)
          // But we'll use it explicitly to ensure consistency
          const normalizedOrigin = window.location.origin
          
          // Remove trailing slash from href if present (for logging/debugging)
          const normalizedHref = currentHref.replace(/\/$/, '') || normalizedOrigin
          
          console.log('Initializing Google Identity Services with:', {
            client_id: GOOGLE_CLIENT_ID,
            origin: normalizedOrigin,
            href: normalizedHref,
            pathname: window.location.pathname,
            fullUrl: window.location.href
          })
          
          // Verify origin matches expected format (no trailing slash after port)
          if (!normalizedOrigin.match(/^https?:\/\/[^\/]+$/)) {
            console.error('Invalid origin format detected:', normalizedOrigin)
            console.error('Origin should be in format: http://host:port or https://host:port')
            return
          }
          
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
          })
          initialized.current = true
          console.log('Google Identity Services initialized successfully')
          console.log('Make sure http://localhost:5176 (without trailing slash) is configured in Google Cloud Console')
        }

        // Render button with a small delay to ensure initialization is complete
        setTimeout(() => {
          if (buttonRef.current && !isSignedIn && initialized.current) {
            console.log('Attempting to render Google Sign In button...', {
              buttonRefExists: !!buttonRef.current,
              buttonRefParent: buttonRef.current?.parentElement?.tagName,
              origin: window.location.origin
            })
            try {
              window.google.accounts.id.renderButton(
                buttonRef.current,
                {
                  type: 'standard',
                  theme: 'outline',
                  size: 'medium',
                  text: 'signin_with',
                  shape: 'rectangular',
                }
              )
              console.log('Google Sign In button rendered successfully')
            } catch (renderError) {
              console.error('Error rendering Google Sign In button:', renderError)
              console.error('Error details:', {
                name: renderError?.name,
                message: renderError?.message,
                stack: renderError?.stack
              })
              // Reset initialized flag on error so we can retry
              initialized.current = false
            }
          } else {
            console.warn('Cannot render button:', {
              hasButtonRef: !!buttonRef.current,
              isSignedIn,
              initialized: initialized.current
            })
          }
        }, 50)
      } catch (error) {
        console.error('Error initializing Google Sign In:', error)
        initialized.current = false
      }
    } else if (isSignedIn) {
      // Reset initialized flag when signed out so button can be re-initialized if needed
      initialized.current = false
    }
  }

  const handleCredentialResponse = async (response) => {
    try {
      // Send ID token to backend
      const result = await onSignIn(response.credential)
      if (result) {
        // Success - auth state will be updated by parent
        console.log('Signed in successfully')
      }
    } catch (error) {
      console.error('Sign in failed:', error)
      alert('Sign in failed. Please try again.')
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  if (isSignedIn && user) {
    return (
      <div className="google-auth-signed-in">
        <div className="google-user-info">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name || 'User'}
              className="google-user-avatar"
            />
          )}
          <span className="google-user-name">{user.name || user.email}</span>
        </div>
        <button
          className="google-sign-out-button"
          onClick={onSignOut}
          title="Sign out"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="google-auth-button-container">
      <div ref={buttonRef}></div>
    </div>
  )
}

export default GoogleAuthButton
