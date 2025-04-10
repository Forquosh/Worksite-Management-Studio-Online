import { create } from 'zustand'

export type NetworkStatus = 'online' | 'offline' | 'server-down'

interface NetworkState {
  status: NetworkStatus
  lastCheck: number | null
  checkNetworkStatus: () => Promise<NetworkStatus>
}

export const useNetworkStatus = create<NetworkState>(set => ({
  status: navigator.onLine ? 'online' : 'offline',
  lastCheck: null,

  checkNetworkStatus: async () => {
    // First check if browser reports we're offline
    if (!navigator.onLine) {
      set({ status: 'offline', lastCheck: Date.now() })
      return 'offline'
    }

    // Then check if server is reachable
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/health', {
        signal: controller.signal,
        // Prevent caching
        headers: { 'Cache-Control': 'no-cache, no-store' }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        set({ status: 'online', lastCheck: Date.now() })
        return 'online'
      } else {
        set({ status: 'server-down', lastCheck: Date.now() })
        return 'server-down'
      }
    } catch (error) {
      console.error('Error checking server status:', error)
      set({ status: 'server-down', lastCheck: Date.now() })
      return 'server-down'
    }
  }
}))

// Set up event listeners for network status changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStatus.getState().checkNetworkStatus()
  })

  window.addEventListener('offline', () => {
    useNetworkStatus.getState().status = 'offline'
    useNetworkStatus.getState().lastCheck = Date.now()
  })

  // Initial check on load
  setTimeout(() => {
    useNetworkStatus.getState().checkNetworkStatus()
  }, 0)

  // Check network status periodically
  setInterval(() => {
    useNetworkStatus.getState().checkNetworkStatus()
  }, 30000) // Check every 30 seconds
}
