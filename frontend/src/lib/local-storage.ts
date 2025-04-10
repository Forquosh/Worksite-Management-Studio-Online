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
      // Remove any duplicate workers by ID
      const uniqueWorkers = Array.from(new Map(workers.map(worker => [worker.id, worker])).values())
      localStorage.setItem(WORKERS_KEY, JSON.stringify(uniqueWorkers))
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

      // Remove any existing operation with the same ID and type
      const filteredOperations = operations.filter(
        op => !(op.id === operation.id && op.type === operation.type)
      )

      // Add the new operation
      filteredOperations.push(operation)

      localStorage.setItem(PENDING_OPERATIONS_KEY, JSON.stringify(filteredOperations))
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

      // Process pending operations
      const processedWorkers = [...serverWorkers]

      // Handle create operations
      pendingOperations
        .filter(op => op.type === 'create' && op.data)
        .forEach(op => {
          if (op.data && !serverWorkersMap.has(op.data.id)) {
            processedWorkers.push(op.data)
          }
        })

      // Handle update operations
      pendingOperations
        .filter(op => op.type === 'update' && op.data)
        .forEach(op => {
          if (op.data) {
            const index = processedWorkers.findIndex(w => w.id === op.id)
            if (index !== -1) {
              processedWorkers[index] = op.data
            }
          }
        })

      // Handle delete operations
      const deletedIds = new Set(
        pendingOperations.filter(op => op.type === 'delete').map(op => op.id)
      )

      // Return deduplicated workers
      const finalWorkers = processedWorkers.filter(w => !deletedIds.has(w.id))

      // Remove any duplicates (by ID)
      return Array.from(new Map(finalWorkers.map(w => [w.id, w])).values())
    } catch (error) {
      console.error('Error merging workers:', error)
      return serverWorkers
    }
  }
}
