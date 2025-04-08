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
      localStorage.setItem(WORKERS_KEY, JSON.stringify(workers))
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
  }
}
