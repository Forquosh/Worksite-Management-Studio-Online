import { create } from 'zustand'

export type NetworkStatus = 'online' | 'offline' | 'server-down'

interface NetworkState {
  status: NetworkStatus
  setIsOnline: (status: boolean) => void
  checkNetworkStatus: () => Promise<void>
}

export const useNetworkStatus = create<NetworkState>(set => ({
  status: navigator.onLine ? 'online' : 'offline',
  setIsOnline: status => set({ status: status ? 'online' : 'offline' }),
  checkNetworkStatus: async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        set({ status: 'online' })
      } else {
        set({ status: 'server-down' })
      }
    } catch {
      set({ status: 'server-down' })
    }
  }
}))

// Set up event listeners for network status changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useNetworkStatus.getState().checkNetworkStatus()
  })

  window.addEventListener('offline', () => {
    useNetworkStatus.getState().setIsOnline(false)
  })
}
