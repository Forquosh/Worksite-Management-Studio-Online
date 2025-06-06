import { create } from 'zustand'
import { Worker, WorkerFilters } from '@/api/model/worker'
import { workersService } from '@/api/services/workers.service'
import { toast } from 'sonner'

// Loading state
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
  }

  // Actions
  fetchWorkers: (filters?: WorkerFilters, page?: number, pageSize?: number) => Promise<Worker[]>
  refreshWorkers: () => Promise<Worker[]>
  setFilters: (filters: WorkerFilters) => void
  addWorker: (worker: Worker) => Promise<Worker>
  updateWorker: (worker: Worker) => Promise<Worker>
  deleteWorker: (id: number) => Promise<void>
  deleteWorkers: (ids: number[]) => Promise<void>
  resetError: () => void
}

export const useWorkersStore = create<WorkersState>((set, get) => ({
  workers: [],
  loadingState: 'idle',
  error: null,
  filters: {},
  pagination: {
    page: 1,
    pageSize: 10,
    total: 0
  },

  setFilters: (filters: WorkerFilters) => {
    set({ filters, pagination: { ...get().pagination, page: 1 } })
  },

  resetError: () => {
    set({ error: null })
  },

  fetchWorkers: async (filters?: WorkerFilters, page?: number, pageSize?: number) => {
    const currentState = get()

    set({ loadingState: 'loading', error: null })
    console.log('Fetching workers with filters:', filters)

    try {
      const paginationParams = {
        page: page || currentState.pagination.page,
        pageSize: pageSize || currentState.pagination.pageSize
      }

      console.log('Fetching with pagination:', paginationParams)
      const result = await workersService.getAll(filters, paginationParams)
      console.log('API result:', result)

      set({
        workers: result.data || [],
        loadingState: 'success',
        filters: filters || {},
        pagination: {
          page: paginationParams.page,
          pageSize: paginationParams.pageSize,
          total: result.total || 0
        }
      })

      return result.data || []
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

  refreshWorkers: async () => {
    const { filters, pagination } = get()
    return get().fetchWorkers(filters, pagination.page, pagination.pageSize)
  },

  addWorker: async (worker: Worker) => {
    set({ loadingState: 'loading', error: null })
    try {
      const newWorker = await workersService.create(worker)
      set(state => ({
        workers: [...state.workers, newWorker],
        loadingState: 'success'
      }))
      toast.success('Worker added successfully!')
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
    set({ loadingState: 'loading', error: null })
    try {
      const updatedWorker = await workersService.update(worker)
      set(state => ({
        workers: state.workers.map(w => (w.id === updatedWorker.id ? updatedWorker : w)),
        loadingState: 'success'
      }))
      toast.success('Worker updated successfully!')
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

  deleteWorker: async (id: number) => {
    set({ loadingState: 'loading', error: null })
    try {
      await workersService.delete(id)
      set(state => ({
        workers: state.workers.filter(w => w.id !== id),
        loadingState: 'success'
      }))
      toast.success('Worker deleted successfully')
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

  deleteWorkers: async (ids: number[]) => {
    set({ loadingState: 'loading', error: null })
    try {
      await workersService.deleteMany(ids)
      set(state => ({
        workers: state.workers.filter(w => !ids.includes(w.id)),
        loadingState: 'success'
      }))
      toast.success(`${ids.length} worker(s) deleted successfully!`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error deleting workers:', error)
      set({
        loadingState: 'error',
        error: errorMessage
      })
      toast.error(`Failed to delete some workers: ${errorMessage}`)
      // Refresh to sync with backend
      get().fetchWorkers(get().filters, get().pagination.page, get().pagination.pageSize)
      throw error
    }
  }
}))
