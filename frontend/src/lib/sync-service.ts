import { WorkersAPI } from '@/api/workers-api'
import { LocalStorageService, PendingOperation } from './local-storage'
import { useNetworkStatus } from './network-status'
import { toast } from 'sonner'

// Sync service to handle syncing data when the application comes back online
export const SyncService = {
  // Sync pending operations with the server
  syncPendingOperations: async (): Promise<void> => {
    const pendingOperations = LocalStorageService.getPendingOperations()

    if (pendingOperations.length === 0) {
      return
    }

    console.log(`Syncing ${pendingOperations.length} pending operations...`)

    // Process operations in order (create, update, delete)
    const sortedOperations = [...pendingOperations].sort((a, b) => {
      // Sort by timestamp first
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp
      }

      // Then by operation type (create before update before delete)
      const typeOrder = { create: 0, update: 1, delete: 2 }
      return typeOrder[a.type] - typeOrder[b.type]
    })

    for (const operation of sortedOperations) {
      try {
        await SyncService.processOperation(operation)
        LocalStorageService.removePendingOperation(operation.id)
        console.log(`Successfully synced operation: ${operation.id}`)
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error)
        // Continue with other operations even if one fails
      }
    }

    toast.success(`Synced ${pendingOperations.length} pending operations`)
  },

  // Process a single operation
  processOperation: async (operation: PendingOperation): Promise<void> => {
    switch (operation.type) {
      case 'create':
        if (operation.data) {
          await WorkersAPI.create(operation.data)
        }
        break
      case 'update':
        if (operation.data) {
          await WorkersAPI.update(operation.data)
        }
        break
      case 'delete':
        await WorkersAPI.delete(operation.id)
        break
      default:
        console.error(`Unknown operation type: ${operation.type}`)
    }
  },

  // Start the sync process when the application comes back online
  startSync: async (): Promise<void> => {
    const networkStatus = useNetworkStatus.getState()

    // Only sync if we're online and the server is up
    if (networkStatus.status === 'online') {
      await SyncService.syncPendingOperations()
    }
  }
}

// Set up event listeners for online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Check if the server is up before syncing
    useNetworkStatus
      .getState()
      .checkNetworkStatus()
      .then(status => {
        if (status === 'online') {
          SyncService.startSync()
        }
      })
  })
}
