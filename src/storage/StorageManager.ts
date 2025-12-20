// Storage Manager - Browser storage with fallback mechanisms

export class StorageManager {
  private static instance: StorageManager
  private isLocalStorageAvailable: boolean

  private constructor() {
    this.isLocalStorageAvailable = this.checkLocalStorageAvailability()
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  private checkLocalStorageAvailability(): boolean {
    try {
      const test = '__storage_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  setItem(key: string, value: any): boolean {
    try {
      const serialized = JSON.stringify(value)
      if (this.isLocalStorageAvailable) {
        localStorage.setItem(key, serialized)
      } else {
        // Fallback to session storage or in-memory storage
        sessionStorage.setItem(key, serialized)
      }
      return true
    } catch (error) {
      console.error('Storage error:', error)
      return false
    }
  }

  getItem<T>(key: string): T | null {
    try {
      const item = this.isLocalStorageAvailable 
        ? localStorage.getItem(key)
        : sessionStorage.getItem(key)
      
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.error('Storage retrieval error:', error)
      return null
    }
  }

  removeItem(key: string): void {
    try {
      if (this.isLocalStorageAvailable) {
        localStorage.removeItem(key)
      } else {
        sessionStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Storage removal error:', error)
    }
  }
}