/**
 * Thumbnail Generation Utilities
 * Generates thumbnails from video files or URLs
 */

/**
 * Generate thumbnail from video file/blob
 */
export function generateThumbnailFromFile(file, timeSeconds = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    
    const objectURL = URL.createObjectURL(file)
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration || 1)
    }
    
    video.onseeked = () => {
      try {
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 240
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert to data URL (JPEG, quality 0.7)
        const dataURL = canvas.toDataURL('image/jpeg', 0.7)
        
        URL.revokeObjectURL(objectURL)
        resolve(dataURL)
      } catch (error) {
        URL.revokeObjectURL(objectURL)
        reject(error)
      }
    }
    
    video.onerror = (error) => {
      URL.revokeObjectURL(objectURL)
      reject(error)
    }
    
    video.src = objectURL
  })
}

/**
 * Generate thumbnail from video URL
 */
export function generateThumbnailFromURL(url, timeSeconds = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(timeSeconds, video.duration || 1)
    }
    
    video.onseeked = () => {
      try {
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 240
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert to data URL (JPEG, quality 0.7)
        const dataURL = canvas.toDataURL('image/jpeg', 0.7)
        resolve(dataURL)
      } catch (error) {
        reject(error)
      }
    }
    
    video.onerror = (error) => {
      reject(error)
    }
    
    video.src = url
  })
}

/**
 * Get placeholder thumbnail data URL
 */
export function getPlaceholderThumbnail() {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 240
  const ctx = canvas.getContext('2d')
  
  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, 320, 240)
  gradient.addColorStop(0, '#E0F7FA')
  gradient.addColorStop(1, '#B2EBF2')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 320, 240)
  
  // Draw play icon
  ctx.fillStyle = '#4FC3F7'
  ctx.beginPath()
  ctx.moveTo(140, 100)
  ctx.lineTo(140, 140)
  ctx.lineTo(180, 120)
  ctx.closePath()
  ctx.fill()
  
  return canvas.toDataURL('image/png')
}
