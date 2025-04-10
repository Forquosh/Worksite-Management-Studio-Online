import { create } from 'zustand'

export type NetworkStatus = 'online' | 'offline' | 'server-down'

interface NetworkState {
  status: NetworkStatus
  lastCheck: number | null
  checkNetworkStatus: () => Promise<void>
}

export const useNetworkStatus = create<NetworkState>(set => ({
  status: navigator.onLine ? 'online' : 'offline',
  lastCheck: null,

  checkNetworkStatus: async () => {
    // If we're offline, no need to check server status
    if (!navigator.onLine) {
      set({ status: 'offline' })
      return
    }

    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        set({ status: 'online', lastCheck: Date.now() })
      } else {
        set({ status: 'server-down', lastCheck: Date.now() })
      }
    } catch {
      set({ status: 'server-down', lastCheck: Date.now() })
    }
  }
}))

// Set up event listeners for network status changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStatus.getState().checkNetworkStatus()
  })

  window.addEventListener('offline', () => {
    useNetworkStatus.getState().checkNetworkStatus()
  })

  // Check network status periodically
  setInterval(() => {
    useNetworkStatus.getState().checkNetworkStatus()
  }, 30000) // Check every 30 seconds
}
