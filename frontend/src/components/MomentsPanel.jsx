/**
 * Convert timestamp string (MM:SS or HH:MM:SS) to seconds
 */
function timestampToSeconds(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return 0
  
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 2) {
    // MM:SS format
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    // HH:MM:SS format
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return 0
}

function MomentsPanel({ moments, currentTime }) {
  const safeMoments = Array.isArray(moments) ? moments : []
  const currentSeconds = currentTime || 0

  // Convert moments to include seconds
  const momentsWithSeconds = safeMoments
    .filter(m => m && typeof m.id !== 'undefined')
    .map(m => ({
      ...m,
      seconds: timestampToSeconds(m.timestamp)
    }))
    .sort((a, b) => a.seconds - b.seconds)

  // "Now" moments: within ±3 seconds
  const nowMoments = momentsWithSeconds.filter(
    m => Math.abs(m.seconds - currentSeconds) <= 3
  )

  // "Upcoming" moments: next 3 moments after currentTime
  const upcomingMoments = momentsWithSeconds
    .filter(m => m.seconds > currentSeconds)
    .slice(0, 3)

  // Check if a moment is "active" (within ±1 second)
  const isActive = (momentSeconds) => {
    return Math.abs(momentSeconds - currentSeconds) <= 1
  }

  return (
    <div className="moments-panel">
      <h2>Moments</h2>
      
      {nowMoments.length > 0 && (
        <div className="moments-section">
          <h3 className="section-title">Now</h3>
          <div className="moments-list">
            {nowMoments.map((moment) => (
              <div
                key={moment.id}
                className={`moment-item ${isActive(moment.seconds) ? 'active' : ''}`}
              >
                <span className="moment-timestamp">{moment.timestamp || ''}</span>
                <span className="moment-text">{moment.text || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingMoments.length > 0 && (
        <div className="moments-section">
          <h3 className="section-title">Upcoming</h3>
          <div className="moments-list">
            {upcomingMoments.map((moment) => (
              <div key={moment.id} className="moment-item">
                <span className="moment-timestamp">{moment.timestamp || ''}</span>
                <span className="moment-text">{moment.text || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {nowMoments.length === 0 && upcomingMoments.length === 0 && (
        <div className="moments-section">
          <h3 className="section-title">All Moments</h3>
          {momentsWithSeconds.length === 0 ? (
            <p className="empty-state">No moments found</p>
          ) : (
            <div className="moments-list">
              {momentsWithSeconds.map((moment) => (
                <div
                  key={moment.id}
                  className={`moment-item ${isActive(moment.seconds) ? 'active' : ''}`}
                >
                  <span className="moment-timestamp">{moment.timestamp || ''}</span>
                  <span className="moment-text">{moment.text || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MomentsPanel
