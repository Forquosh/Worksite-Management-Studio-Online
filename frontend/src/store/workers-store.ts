import { create } from 'zustand'
import { WorkersAPI, Worker, WorkerFilters } from '@/api/workers-api'
import { toast } from 'sonner'
import { LocalStorageService } from '@/lib/local-storage'
import { useNetworkStatus, NetworkStatus } from '@/lib/network-status'
import { SyncService } from '@/lib/sync-service'

// Enhanced loading state type
type LoadingState = 'idle' | 'loading' | 'success' | 'error'

interface WorkersState {
  // State
  workers: Worker[]
  loadingState: LoadingState
  error: string | null
  filters: WorkerFilters
  pagination: {
    page: number
    pageSize: number
    total: number
    hasMore: boolean
  }
  lastFetchTime: number | null
  cacheTimeout: number // milliseconds
  isOfflineMode: boolean
  networkStatus: NetworkStatus

  // Actions
  fetchWorkers: (filters?: WorkerFilters, page?: number, pageSize?: number) => Promise<Worker[]>
  setFilters: (filters: WorkerFilters) => void
  addWorker: (worker: Worker) => Promise<Worker>
  updateWorker: (worker: Worker) => Promise<Worker>
  deleteWorker: (id: string) => Promise<void>
  deleteWorkers: (ids: string[]) => Promise<void>
  resetError: () => void
  loadMoreWorkers: () => Promise<void>
  checkNetworkStatus: () => Promise<void>
}

export const useWorkersStore = create<WorkersState>((set, get) => ({
  workers: [],
  loadingState: 'idle',
  error: null,
  filters: {},
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: false
  },
  lastFetchTime: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes cache
  isOfflineMode: false,
  networkStatus: 'online',

  setFilters: (filters: WorkerFilters) => {
    set({ filters, pagination: { ...get().pagination, page: 1 } })
  },

  resetError: () => {
    set({ error: null })
  },

  checkNetworkStatus: async () => {
    const status = await useNetworkStatus.getState().checkNetworkStatus()
    const isOfflineMode = status !== 'online'

    set({ networkStatus: status, isOfflineMode })

    // If we're back online, try to sync pending operations
    if (status === 'online') {
      await SyncService.startSync()
    }

    // Return void instead of the status
  },

  fetchWorkers: async (filters?: WorkerFilters, page?: number, pageSize?: number) => {
    const currentState = get()
    const currentTime = Date.now()

    // Check network status first
    await currentState.checkNetworkStatus()

    // If we're in offline mode, use local storage
    if (currentState.isOfflineMode) {
      console.log('Using local storage for workers data')
      const localWorkers = LocalStorageService.getWorkers()

      // Apply filters to local data
      let filteredWorkers = [...localWorkers]

      if (filters) {
        if (filters.position) {
          filteredWorkers = filteredWorkers.filter(w =>
            w.position.toLowerCase().includes(filters.position!.toLowerCase())
          )
        }
        if (filters.minAge) {
          filteredWorkers = filteredWorkers.filter(w => w.age >= filters.minAge!)
        }
        if (filters.maxAge) {
          filteredWorkers = filteredWorkers.filter(w => w.age <= filters.maxAge!)
        }
        if (filters.minSalary) {
          filteredWorkers = filteredWorkers.filter(w => w.salary >= filters.minSalary!)
        }
        if (filters.maxSalary) {
          filteredWorkers = filteredWorkers.filter(w => w.salary <= filters.maxSalary!)
        }
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase()
          filteredWorkers = filteredWorkers.filter(
            w =>
              w.name.toLowerCase().includes(searchTerm) ||
              w.position.toLowerCase().includes(searchTerm)
          )
        }
      }

      // Apply pagination
      const paginationParams = {
        page: page || currentState.pagination.page,
        pageSize: pageSize || currentState.pagination.pageSize
      }

      const startIndex = (paginationParams.page - 1) * paginationParams.pageSize
      const endIndex = startIndex + paginationParams.pageSize
      const paginatedWorkers = filteredWorkers.slice(startIndex, endIndex)

      set({
        workers: paginatedWorkers,
        loadingState: 'success',
        filters: filters || {},
        pagination: {
          page: paginationParams.page,
          pageSize: paginationParams.pageSize,
          total: filteredWorkers.length,
          hasMore: endIndex < filteredWorkers.length
        },
        lastFetchTime: currentTime
      })

      return paginatedWorkers
    }

    // Check if we have cached data that's still valid
    if (
      currentState.lastFetchTime &&
      currentTime - currentState.lastFetchTime < currentState.cacheTimeout &&
      currentState.loadingState === 'success' &&
      JSON.stringify(currentState.filters) === JSON.stringify(filters || {}) &&
      currentState.pagination.page === (page || currentState.pagination.page) &&
      currentState.pagination.pageSize === (pageSize || currentState.pagination.pageSize)
    ) {
      return currentState.workers
    }

    set({ loadingState: 'loading', error: null })
    console.log('Fetching workers with filters:', filters)

    try {
      const paginationParams = {
        page: page || currentState.pagination.page,
        pageSize: pageSize || currentState.pagination.pageSize
      }

      console.log('Fetching with pagination:', paginationParams)
      const result = await WorkersAPI.getAll(filters, paginationParams)
      console.log('API result:', result)

      // Store in local storage for offline use
      LocalStorageService.setWorkers(result.data)

      // For infinite scrolling, we need to append new data instead of replacing it
      // when loading more (page > 1)
      const isAppending = page && page > 1

      // Merge with any pending operations from local storage
      const mergedData = LocalStorageService.mergeWorkers(result.data)

      const updatedWorkers = isAppending ? [...currentState.workers, ...mergedData] : mergedData

      set({
        workers: updatedWorkers,
        loadingState: 'success',
        filters: filters || {},
        pagination: {
          page: paginationParams.page,
          pageSize: paginationParams.pageSize,
          total: result.total,
          hasMore: updatedWorkers.length < result.total
        },
        lastFetchTime: currentTime
      })

      return updatedWorkers
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error fetching workers:', error)
      set({
        loadingState: 'error',
        error: errorMessage
      })
      toast.error(`Error fetching workers: ${errorMessage}`)
      throw error
    }
  },

  loadMoreWorkers: async () => {
    const currentState = get()

    // Don't load more if we're already loading or there's no more data
    if (currentState.loadingState === 'loading' || !currentState.pagination.hasMore) {
      return
    }

    // Load the next page
    const nextPage = currentState.pagination.page + 1
    await currentState.fetchWorkers(
      currentState.filters,
      nextPage,
      currentState.pagination.pageSize
    )
  },

  addWorker: async (worker: Worker) => {
    const currentState = get()
    set({ loadingState: 'loading', error: null })

    try {
      let newWorker: Worker

      if (currentState.isOfflineMode) {
        // Generate a temporary ID for offline mode
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        newWorker = { ...worker, id: tempId }

        // Add to local storage
        const localWorkers = LocalStorageService.getWorkers()
        LocalStorageService.setWorkers([...localWorkers, newWorker])

        // Add to pending operations
        LocalStorageService.addPendingOperation({
          id: tempId,
          type: 'create',
          data: newWorker,
          timestamp: Date.now()
        })

        // Update state
        set(state => ({
          workers: [...state.workers, newWorker],
          loadingState: 'success'
        }))

        toast.success('Worker added (offline mode)')
      } else {
        // Online mode - call API
        newWorker = await WorkersAPI.create(worker)

        // Update state
        set(state => ({
          workers: [...state.workers, newWorker],
          loadingState: 'success'
        }))

        // Update local storage
        const localWorkers = LocalStorageService.getWorkers()
        LocalStorageService.setWorkers([...localWorkers, newWorker])

        toast.success('Worker added successfully!')
      }

      return newWorker
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error adding worker:', error)
      set({
        loadingState: 'error',
        error: errorMessage
      })
      toast.error(`Failed to add worker: ${errorMessage}`)
      throw error
    }
  },

  updateWorker: async (worker: Worker) => {
    const currentState = get()
    set({ loadingState: 'loading', error: null })

    try {
      let updatedWorker: Worker

      if (currentState.isOfflineMode) {
        // In offline mode, update local storage
        const localWorkers = LocalStorageService.getWorkers()
        const updatedWorkers = localWorkers.map(w => (w.id === worker.id ? worker : w))
        LocalStorageService.setWorkers(updatedWorkers)

        // Add to pending operations
        LocalStorageService.addPendingOperation({
          id: worker.id,
          type: 'update',
          data: worker,
          timestamp: Date.now()
        })

        // Update state
        set(state => ({
          workers: state.workers.map(w => (w.id === worker.id ? worker : w)),
          loadingState: 'success'
        }))

        toast.success('Worker updated (offline mode)')
        updatedWorker = worker
      } else {
        // Online mode - call API
        updatedWorker = await WorkersAPI.update(worker)

        // Update state
        set(state => ({
          workers: state.workers.map(w => (w.id === updatedWorker.id ? updatedWorker : w)),
          loadingState: 'success'
        }))

        // Update local storage
        const localWorkers = LocalStorageService.getWorkers()
        const updatedLocalWorkers = localWorkers.map(w =>
          w.id === updatedWorker.id ? updatedWorker : w
        )
        LocalStorageService.setWorkers(updatedLocalWorkers)

        toast.success('Worker updated successfully!')
      }

      return updatedWorker
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error updating worker:', error)
      set({
        loadingState: 'error',
        error: errorMessage
      })
      toast.error(`Failed to update worker: ${errorMessage}`)
      throw error
    }
  },

  deleteWorker: async (id: string) => {
    const currentState = get()
    set({ loadingState: 'loading', error: null })

    try {
      if (currentState.isOfflineMode) {
        // In offline mode, update local storage
        const localWorkers = LocalStorageService.getWorkers()
        const updatedWorkers = localWorkers.filter(w => w.id !== id)
        LocalStorageService.setWorkers(updatedWorkers)

        // Add to pending operations
        LocalStorageService.addPendingOperation({
          id,
          type: 'delete',
          timestamp: Date.now()
        })

        // Update state
        set(state => ({
          workers: state.workers.filter(w => w.id !== id),
          loadingState: 'success'
        }))

        toast.success('Worker deleted (offline mode)')
      } else {
        // Online mode - call API
        await WorkersAPI.delete(id)

        // Update state
        set(state => ({
          workers: state.workers.filter(w => w.id !== id),
          loadingState: 'success'
        }))

        // Update local storage
        const localWorkers = LocalStorageService.getWorkers()
        const updatedLocalWorkers = localWorkers.filter(w => w.id !== id)
        LocalStorageService.setWorkers(updatedLocalWorkers)

        toast.success('Worker deleted successfully')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error deleting worker:', error)
      set({
        loadingState: 'error',
        error: errorMessage
      })
      toast.error(`Failed to delete worker: ${errorMessage}`)
      throw error
    }
  },

  deleteWorkers: async (ids: string[]) => {
    const currentState = get()
    set({ loadingState: 'loading', error: null })

    try {
      if (currentState.isOfflineMode) {
        // In offline mode, update local storage
        const localWorkers = LocalStorageService.getWorkers()
        const updatedWorkers = localWorkers.filter(w => !ids.includes(w.id))
        LocalStorageService.setWorkers(updatedWorkers)

        // Add to pending operations
        ids.forEach(id => {
          LocalStorageService.addPendingOperation({
            id,
            type: 'delete',
            timestamp: Date.now()
          })
        })

        // Update state
        set(state => ({
          workers: state.workers.filter(w => !ids.includes(w.id)),
          loadingState: 'success'
        }))

        toast.success(`${ids.length} workers deleted (offline mode)`)
      } else {
        // Online mode - call API
        await WorkersAPI.deleteMany(ids)

        // Update state
        set(state => ({
          workers: state.workers.filter(w => !ids.includes(w.id)),
          loadingState: 'success'
        }))

        // Update local storage
        const localWorkers = LocalStorageService.getWorkers()
        const updatedLocalWorkers = localWorkers.filter(w => !ids.includes(w.id))
        LocalStorageService.setWorkers(updatedLocalWorkers)

        toast.success(`${ids.length} workers deleted successfully!`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error deleting workers:', error)
      set({
        loadingState: 'error',
        error: errorMessage
      })
      toast.error(`Failed to delete some workers: ${errorMessage}`)

      // Refresh to sync with backend
      if (!currentState.isOfflineMode) {
        get().fetchWorkers(get().filters, get().pagination.page, get().pagination.pageSize)
      }

      throw error
    }
  }
}))
