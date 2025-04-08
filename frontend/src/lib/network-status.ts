import { create } from 'zustand'

export type NetworkStatus = 'online' | 'offline' | 'server-down'

interface NetworkStatusState {
  status: NetworkStatus
  lastChecked: number | null
  checkNetworkStatus: () => Promise<NetworkStatus>
  checkServerStatus: () => Promise<boolean>
  updateStatus: (status: NetworkStatus) => void
}

export const useNetworkStatus = create<NetworkStatusState>((set, get) => ({
  status: 'online',
  lastChecked: null,

  checkNetworkStatus: async () => {
    // Check if the browser is online
    if (!navigator.onLine) {
      set({ status: 'offline', lastChecked: Date.now() })
      return 'offline'
    }

    // If online, check server status
    const isServerUp = await get().checkServerStatus()
    const status = isServerUp ? 'online' : 'server-down'
    set({ status, lastChecked: Date.now() })
    return status
  },

  checkServerStatus: async () => {
    try {
      // Try to fetch a small resource from the server
      const response = await fetch('http://localhost:8080/api/health', {
        method: 'HEAD',
        // Add a timeout to avoid long waits
        signal: AbortSignal.timeout(3000)
      })
      return response.ok
    } catch (error) {
      console.error('Server status check failed:', error)
      return false
    }
  },

  updateStatus: (status: NetworkStatus) => {
    set({ status, lastChecked: Date.now() })
  }
}))

// Set up event listeners for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStatus.getState().checkNetworkStatus()
  })

  window.addEventListener('offline', () => {
    useNetworkStatus.getState().updateStatus('offline')
  })
}
