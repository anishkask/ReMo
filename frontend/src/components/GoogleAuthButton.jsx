import { useEffect, useRef } from 'react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '632365523992-df065eqhlv3kh0io083e1bn6v54ggeee.apps.googleusercontent.com'

/**
 * GoogleAuthButton component using Google Identity Services
 * Based on the working gis-min.html implementation
 */
function GoogleAuthButton({ onSignIn, onSignOut, isSignedIn, user }) {
  const buttonRef = useRef(null)
  const scriptLoaded = useRef(false)
  const initialized = useRef(false)

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
      console.warn('Google Identity Services not loaded yet')
      return
    }

    if (!isSignedIn && buttonRef.current && !initialized.current) {
      // Clear any existing button first
      buttonRef.current.innerHTML = ''
      
      const currentOrigin = window.location.origin
      const currentHref = window.location.href
      
      // Normalize origin - ensure no trailing slash issues
      const normalizedOrigin = currentOrigin.replace(/\/$/, '')
      
      console.log('=== Google OAuth Initialization ===')
      console.log('Client ID:', GOOGLE_CLIENT_ID)
      console.log('Current Origin:', normalizedOrigin)
      console.log('Current Href:', currentHref)
      console.log('Pathname:', window.location.pathname)
      
      // Critical: Show exact origin that needs to be configured
      console.error('⚠️ CRITICAL: Add this EXACT origin to Google Cloud Console:')
      console.error('   Origin:', normalizedOrigin)
      console.error('')
      console.error('Steps to fix:')
      console.error('1. Go to: https://console.cloud.google.com/apis/credentials')
      console.error('2. Find OAuth 2.0 Client ID:', GOOGLE_CLIENT_ID.split('-')[0] + '-...')
      console.error('3. Under "Authorized JavaScript origins", click "ADD URI"')
      console.error('4. Enter EXACTLY:', normalizedOrigin)
      console.error('5. Click "SAVE"')
      console.error('6. Wait 1-2 minutes for changes to propagate')
      console.error('7. Hard refresh browser (Ctrl+Shift+R)')
      console.error('=====================================')

      try {
        // Initialize Google Sign In button (only once)
        if (!initialized.current) {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
          })
          initialized.current = true
          console.log('Google Identity Services initialized successfully')
        }

        // Render button with a small delay to ensure initialization is complete
        setTimeout(() => {
          if (buttonRef.current && !isSignedIn && initialized.current) {
            console.log('Attempting to render Google Sign In button...')
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
              
              // Monitor for 403 errors
              setTimeout(() => {
                const errorMsg = document.getElementById('google-auth-error-message')
                if (errorMsg) {
                  // Check if button failed to load (403 error)
                  const buttonElement = buttonRef.current?.querySelector('iframe')
                  if (!buttonElement || buttonElement.style.display === 'none') {
                    errorMsg.style.display = 'block'
                  }
                }
              }, 1000)
            } catch (renderError) {
              console.error('Error rendering Google Sign In button:', renderError)
              initialized.current = false
            }
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
      console.log('✅ Credential response received from Google')
      console.log('ID Token length:', response.credential?.length || 0)
      
      // Send ID token to backend via onSignIn callback
      if (onSignIn) {
        console.log('Sending ID token to backend...')
        const result = await onSignIn(response.credential)
        if (result) {
          console.log('✅ Signed in successfully!')
        }
      } else {
        console.error('onSignIn callback not provided')
      }
    } catch (error) {
      console.error('❌ Sign in failed:', error)
      
      // Provide helpful error messages
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        alert('Sign in failed: Backend server is not running.\n\nPlease start your backend server on port 8000.')
      } else if (error.message?.includes('403') || error.message?.includes('not allowed')) {
        alert('Sign in failed: Origin not authorized.\n\nPlease add ' + window.location.origin + ' to Google Cloud Console.')
      } else {
        alert('Sign in failed: ' + (error.message || 'Unknown error') + '\n\nPlease check the console for details.')
      }
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
      {/* Show error message if Google API fails */}
      {typeof window.google !== 'undefined' && window.google.accounts && (
        <div id="google-auth-error-message" style={{ display: 'none', marginTop: '0.5rem', fontSize: '0.75rem', color: '#d32f2f' }}>
          <div>⚠️ 403 Error: Origin not authorized</div>
          <div style={{ marginTop: '0.25rem' }}>
            Add <strong>{window.location.origin}</strong> to Google Cloud Console
          </div>
        </div>
      )}
    </div>
  )
}

export default GoogleAuthButton
