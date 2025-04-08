import { create } from 'zustand'

interface NetworkState {
  isOnline: boolean
  setIsOnline: (status: boolean) => void
  checkNetworkStatus: () => Promise<void>
}

export const useNetworkStatus = create<NetworkState>(set => ({
  isOnline: navigator.onLine,
  setIsOnline: status => set({ isOnline: status }),
  checkNetworkStatus: async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        set({ isOnline: true })
      } else {
        set({ isOnline: false })
      }
    } catch {
      set({ isOnline: false })
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
