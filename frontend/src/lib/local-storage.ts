import { Worker } from '@/api/workers-api'

// Types for pending operations
export type PendingOperationType = 'create' | 'update' | 'delete'

export interface PendingOperation {
  id: string
  type: PendingOperationType
  data?: Worker
  timestamp: number
}

// Local storage keys
const WORKERS_KEY = 'workers_data'
const PENDING_OPERATIONS_KEY = 'pending_operations'

// Local storage service
export const LocalStorageService = {
  // Workers data
  getWorkers: (): Worker[] => {
    try {
      const data = localStorage.getItem(WORKERS_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error getting workers from local storage:', error)
      return []
    }
  },

  setWorkers: (workers: Worker[]): void => {
    try {
      // Ensure we're not storing temporary IDs in local storage
      const sanitizedWorkers = workers.map(worker => {
        // If the ID starts with 'temp_', it's a temporary ID from offline mode
        // We should keep it as is for pending operations
        return worker
      })
      localStorage.setItem(WORKERS_KEY, JSON.stringify(sanitizedWorkers))
    } catch (error) {
      console.error('Error saving workers to local storage:', error)
    }
  },

  // Pending operations
  getPendingOperations: (): PendingOperation[] => {
    try {
      const data = localStorage.getItem(PENDING_OPERATIONS_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error getting pending operations from local storage:', error)
      return []
    }
  },

  addPendingOperation: (operation: PendingOperation): void => {
    try {
      const operations = LocalStorageService.getPendingOperations()
      operations.push(operation)
      localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(operations))
    } catch (error) {
      console.error('Error adding pending operation to local storage:', error)
    }
  },

  removePendingOperation: (id: string): void => {
    try {
      const operations = LocalStorageService.getPendingOperations()
      const filteredOperations = operations.filter(op => op.id !== id)
      localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filteredOperations))
    } catch (error) {
      console.error('Error removing pending operation from local storage:', error)
    }
  },

  clearPendingOperations: (): void => {
    try {
      localStorage.removeItem(PENDING_OPERATIONS_KEY)
    } catch (error) {
      console.error('Error clearing pending operations from local storage:', error)
    }
  },

  // Helper method to merge local workers with server workers
  mergeWorkers: (serverWorkers: Worker[]): Worker[] => {
    try {
      const pendingOperations = LocalStorageService.getPendingOperations()

      // Create a map of server workers by ID for quick lookup
      const serverWorkersMap = new Map(serverWorkers.map(w => [w.id, w]))

      // Add any local workers that don't exist on the server
      // (these are likely pending operations)
      const mergedWorkers = [...serverWorkers]

      // Add pending create operations
      pendingOperations
        .filter(op => op.type === 'create' && op.data)
        .forEach(op => {
          if (op.data && !serverWorkersMap.has(op.data.id)) {
            mergedWorkers.push(op.data)
          }
        })

      return mergedWorkers
    } catch (error) {
      console.error('Error merging workers:', error)
      return serverWorkers
    }
  }
}
