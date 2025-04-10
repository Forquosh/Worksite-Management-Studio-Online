import { create } from 'zustand'
import { WorkersAPI, Worker, WorkerFilters } from '@/api/workers-api'
import { toast } from 'sonner'
import { LocalStorageService } from '@/lib/local-storage'
import { useNetworkStatus } from '@/store/network-status'

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

  // Actions
  fetchWorkers: (filters?: WorkerFilters, page?: number, pageSize?: number) => Promise<Worker[]>
  setFilters: (filters: WorkerFilters) => void
  addWorker: (worker: Worker) => Promise<Worker>
  updateWorker: (worker: Worker) => Promise<Worker>
  deleteWorker: (id: string) => Promise<void>
  deleteWorkers: (ids: string[]) => Promise<void>
  resetError: () => void
  loadMoreWorkers: () => Promise<void>
  syncPendingOperations: () => Promise<void>
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

  setFilters: (filters: WorkerFilters) => {
    set({ filters, pagination: { ...get().pagination, page: 1 } })
  },

  resetError: () => {
    set({ error: null })
  },

  fetchWorkers: async (filters?: WorkerFilters, page?: number, pageSize?: number) => {
    const currentState = get()
    const currentTime = Date.now()

    // Check network status
    const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()

    // Determine if we should be in offline mode
    const shouldBeOffline = networkStatus !== 'online'
    if (shouldBeOffline !== currentState.isOfflineMode) {
      set({ isOfflineMode: shouldBeOffline })
    }

    // Determine if we're loading the first page or appending
    const isLoadingFirstPage =
      page === 1 || (page === undefined && currentState.pagination.page === 1)
    const isAppending = page !== undefined && page > 1

    // Set loading state
    if (!isAppending) {
      set({ loadingState: 'loading', error: null })
    }

    // If we're in offline mode, use local storage
    if (shouldBeOffline) {
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

      // For pagination, append to existing results if not first page
      const updatedWorkers = isAppending
        ? [...currentState.workers, ...paginatedWorkers]
        : paginatedWorkers

      set({
        workers: updatedWorkers,
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

      return updatedWorkers
    }

    // Online mode - use API
    try {
      const paginationParams = {
        page: page || currentState.pagination.page,
        pageSize: pageSize || currentState.pagination.pageSize
      }

      console.log('Fetching with pagination:', paginationParams, 'and filters:', filters)
      const result = await WorkersAPI.getAll(filters, paginationParams)
      console.log('API result:', result)

      // Store in local storage for offline use (only full set, not paginated data)
      if (isLoadingFirstPage) {
        LocalStorageService.setWorkers(result.data)
      } else {
        // Append to existing local storage data
        const existingData = LocalStorageService.getWorkers()
        const newIds = new Set(result.data.map(w => w.id))
        const uniqueExistingData = existingData.filter(w => !newIds.has(w.id))
        LocalStorageService.setWorkers([...uniqueExistingData, ...result.data])
      }

      // For infinite scrolling, we need to append new data instead of replacing it
      // when loading more (page > 1)
      const updatedWorkers = isAppending ? [...currentState.workers, ...result.data] : result.data

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

      // Switch to offline mode if we couldn't reach the server
      set({
        loadingState: 'error',
        error: errorMessage,
        isOfflineMode: true
      })

      toast.error(`Error fetching workers: ${errorMessage}`)

      // Try to serve data from local storage as fallback
      return get().fetchWorkers(filters, page, pageSize)
    }
  },

  loadMoreWorkers: async () => {
    const currentState = get()

    // Don't load more if we're already loading or there's no more data
    if (currentState.loadingState === 'loading' || !currentState.pagination.hasMore) {
      console.log('Skipping loadMore - already loading or no more data')
      return
    }

    // Load the next page
    const nextPage = currentState.pagination.page + 1
    console.log('Loading more workers - page:', nextPage)
    await currentState.fetchWorkers(
      currentState.filters,
      nextPage,
      currentState.pagination.pageSize
    )
  },

  syncPendingOperations: async () => {
    const pendingOperations = LocalStorageService.getPendingOperations()

    if (pendingOperations.length === 0) {
      return
    }

    const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
    if (networkStatus !== 'online') {
      toast.error('Cannot sync while offline')
      return
    }

    let successCount = 0
    let failCount = 0

    try {
      // Process each pending operation
      for (const operation of pendingOperations) {
        try {
          switch (operation.type) {
            case 'create':
              await WorkersAPI.create(operation.data!)
              break
            case 'update':
              await WorkersAPI.update(operation.data!)
              break
            case 'delete':
              await WorkersAPI.delete(operation.id)
              break
          }
          // Remove the operation after successful sync
          LocalStorageService.removePendingOperation(operation.id)
          successCount++
        } catch (error) {
          console.error(`Error syncing operation ${operation.id}:`, error)
          failCount++
        }
      }

      // Refresh the data after syncing
      await get().fetchWorkers(
        get().filters,
        1, // Reset to first page after sync
        get().pagination.pageSize
      )

      if (successCount > 0 && failCount === 0) {
        toast.success(`Successfully synced ${successCount} operations`)
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`Synced ${successCount} operations, but ${failCount} failed`)
      } else if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} operations`)
      }
    } catch (error) {
      console.error('Error in sync process:', error)
      toast.error('Failed to sync operations. Will retry later.')
    }
  },

  addWorker: async (worker: Worker) => {
    set({ loadingState: 'loading', error: null })

    try {
      let newWorker: Worker

      // Check network status before proceeding
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      const isOffline = networkStatus !== 'online'

      if (isOffline) {
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

        // Update state - we need to be careful not to add duplicates
        set(state => ({
          workers: [...state.workers, newWorker],
          loadingState: 'success',
          isOfflineMode: true // Ensure we're in offline mode
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

        // Update local storage - avoid duplicates
        const localWorkers = LocalStorageService.getWorkers()
        const filteredLocalWorkers = localWorkers.filter(w => w.id !== newWorker.id)
        LocalStorageService.setWorkers([...filteredLocalWorkers, newWorker])

        toast.success('Worker added successfully!')
      }

      return newWorker
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error adding worker:', error)

      // If we hit an error, switch to offline mode and try again
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      if (networkStatus !== 'online') {
        set({ isOfflineMode: true, loadingState: 'idle' })
        return get().addWorker(worker)
      }

      set({
        loadingState: 'error',
        error: errorMessage
      })

      toast.error(`Failed to add worker: ${errorMessage}`)
      throw error
    }
  },

  updateWorker: async (worker: Worker) => {
    set({ loadingState: 'loading', error: null })

    try {
      let updatedWorker: Worker

      // Check network status before proceeding
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      const isOffline = networkStatus !== 'online'

      if (isOffline) {
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
          loadingState: 'success',
          isOfflineMode: true // Ensure we're in offline mode
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

      // If we hit an error, switch to offline mode and try again
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      if (networkStatus !== 'online') {
        set({ isOfflineMode: true, loadingState: 'idle' })
        return get().updateWorker(worker)
      }

      set({
        loadingState: 'error',
        error: errorMessage
      })

      toast.error(`Failed to update worker: ${errorMessage}`)
      throw error
    }
  },

  deleteWorker: async (id: string) => {
    set({ loadingState: 'loading', error: null })

    try {
      // Check network status before proceeding
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      const isOffline = networkStatus !== 'online'

      if (isOffline) {
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
          loadingState: 'success',
          isOfflineMode: true // Ensure we're in offline mode
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

      // If we hit an error, switch to offline mode and try again
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      if (networkStatus !== 'online') {
        set({ isOfflineMode: true, loadingState: 'idle' })
        return get().deleteWorker(id)
      }

      set({
        loadingState: 'error',
        error: errorMessage
      })

      toast.error(`Failed to delete worker: ${errorMessage}`)
      throw error
    }
  },

  deleteWorkers: async (ids: string[]) => {
    set({ loadingState: 'loading', error: null })

    try {
      // Check network status before proceeding
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      const isOffline = networkStatus !== 'online'

      if (isOffline) {
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
          loadingState: 'success',
          isOfflineMode: true // Ensure we're in offline mode
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

      // If we hit an error, switch to offline mode and try again
      const networkStatus = await useNetworkStatus.getState().checkNetworkStatus()
      if (networkStatus !== 'online') {
        set({ isOfflineMode: true, loadingState: 'idle' })
        return get().deleteWorkers(ids)
      }

      set({
        loadingState: 'error',
        error: errorMessage
      })

      toast.error(`Failed to delete some workers: ${errorMessage}`)
      throw error
    }
  }
}))
