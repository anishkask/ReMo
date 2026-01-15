/**
 * Video Library Storage Utilities
 * Handles localStorage for metadata and IndexedDB for local file blobs
 */

const STORAGE_KEY = 'remoVideoLibrary'
const DB_NAME = 'remoVideoDB'
const DB_VERSION = 1
const STORE_NAME = 'videoFiles'

/**
 * IndexedDB wrapper for storing video file blobs
 */
class VideoDB {
  constructor() {
    this.db = null
  }

  async init() {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }

  async saveFile(id, file) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(file, id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getFile(id) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteFile(id) {
    await this.init()
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

const videoDB = new VideoDB()

/**
 * Load all videos from localStorage
 */
export function loadVideos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading videos:', error)
    return []
  }
}

/**
 * Save videos array to localStorage
 */
export function saveVideos(videos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
  } catch (error) {
    console.error('Error saving videos:', error)
  }
}

/**
 * Add a new video to the library
 */
export async function addVideo(video) {
  const videos = loadVideos()
  
  // If local video, save file to IndexedDB
  if (video.sourceType === 'local' && video.file) {
    await videoDB.saveFile(video.id, video.file)
    // Remove file from video object before storing metadata
    const { file, ...videoMetadata } = video
    videos.push(videoMetadata)
  } else {
    videos.push(video)
  }
  
  saveVideos(videos)
  return video
}

/**
 * Remove a video from the library
 */
export async function removeVideo(id) {
  const videos = loadVideos()
  const video = videos.find(v => v.id === id)
  
  // If local video, delete from IndexedDB
  if (video && video.sourceType === 'local') {
    await videoDB.deleteFile(id)
  }
  
  const filtered = videos.filter(v => v.id !== id)
  saveVideos(filtered)
}

/**
 * Get file blob for a local video ID
 */
export async function getLocalVideoFile(id) {
  return await videoDB.getFile(id)
}

/**
 * Update video metadata (e.g., after reconnecting local file)
 */
export async function updateVideo(id, updates) {
  const videos = loadVideos()
  const index = videos.findIndex(v => v.id === id)
  
  if (index === -1) return null
  
  const video = videos[index]
  
  // If updating with a new file, save to IndexedDB
  if (updates.file && video.sourceType === 'local') {
    await videoDB.saveFile(id, updates.file)
    const { file, ...fileUpdates } = updates
    Object.assign(video, fileUpdates)
  } else {
    Object.assign(video, updates)
  }
  
  saveVideos(videos)
  return video
}
