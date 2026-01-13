function MomentsList({ moments, loading, error }) {
  // Always ensure moments is an array
  const safeMoments = Array.isArray(moments) ? moments : []

  return (
    <div className="moments-card">
      <h2>Moments</h2>
      {loading && <p>Loading moments...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && safeMoments.length === 0 && (
        <p>No moments found</p>
      )}
      {!loading && !error && safeMoments.length > 0 && (
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
  )
}

export default MomentsList
