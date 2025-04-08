import * as React from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  Row,
  Table as TableInstance,
  Column
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCcwDot,
  Search,
  Wifi,
  WifiOff,
  Server
} from 'lucide-react'

// UI Components
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { Badge } from '@/components/ui/badge'
import { useInView } from 'react-intersection-observer'

// Worker-specific components
import AddWorkerForm from '@/components/workers/add-form'
import EditWorkerForm from '@/components/workers/edit-form'

// API and store
import { Worker, WorkerFilters } from '@/api/workers-api'
import { useWorkersStore } from '@/store/workers-store'

export function WorkersDataTable() {
  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<Record<string, boolean>>({})
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [filters, setFilters] = React.useState<WorkerFilters>({})
  const [tempFilters, setTempFilters] = React.useState<WorkerFilters>({})
  const [searchTerm, setSearchTerm] = React.useState('')

  // UI state
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [selectedWorker, setSelectedWorker] = React.useState<Worker | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteMultipleConfirmOpen, setDeleteMultipleConfirmOpen] = React.useState(false)
  const [workerToDelete, setWorkerToDelete] = React.useState<Worker | null>(null)
  const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(false)

  // Get data and methods from store
  const {
    workers,
    loadingState,
    pagination,
    fetchWorkers,
    addWorker,
    updateWorker,
    deleteWorker,
    deleteWorkers,
    setFilters: setStoreFilters,
    loadMoreWorkers,
    networkStatus,
    checkNetworkStatus
  } = useWorkersStore()

  // Set up intersection observer for infinite scrolling
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false
  })

  // Fetch workers on mount and when dependencies change
  React.useEffect(() => {
    fetchWorkers(filters, pagination.page, pagination.pageSize)
  }, [fetchWorkers, filters, pagination.page, pagination.pageSize])

  // Load more workers when scrolling to the bottom
  React.useEffect(() => {
    if (inView && pagination.hasMore && loadingState !== 'loading') {
      loadMoreWorkers()
    }
  }, [inView, pagination.hasMore, loadingState, loadMoreWorkers])

  // Check network status periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      checkNetworkStatus()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [checkNetworkStatus])

  // Define table columns
  const columns = React.useMemo<ColumnDef<Worker>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }: { table: TableInstance<Worker> }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Select all'
            className='mx-auto'
          />
        ),
        cell: ({ row }: { row: Row<Worker> }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label='Select row'
            className='mx-auto'
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 50
      },
      {
        accessorKey: 'name',
        header: ({ column }: { column: Column<Worker> }) => (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-center'
          >
            Name
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        ),
        cell: ({ row }: { row: Row<Worker> }) => (
          <div className='text-center capitalize'>{row.getValue('name')}</div>
        ),
        size: 200
      },
      {
        accessorKey: 'age',
        header: ({ column }: { column: Column<Worker> }) => (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-center'
          >
            Age
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        ),
        cell: ({ row }: { row: Row<Worker> }) => (
          <div className='text-center'>{row.getValue('age')}</div>
        ),
        size: 100
      },
      {
        accessorKey: 'position',
        header: ({ column }: { column: Column<Worker> }) => (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-center'
          >
            Position
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        ),
        cell: ({ row }: { row: Row<Worker> }) => (
          <div className='text-center capitalize'>{row.getValue('position')}</div>
        ),
        size: 200
      },
      {
        accessorKey: 'salary',
        header: ({ column }: { column: Column<Worker> }) => (
          <Button
            variant='ghost'
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className='w-full justify-center'
          >
            Salary
            <ArrowUpDown className='ml-2 h-4 w-4' />
          </Button>
        ),
        cell: ({ row }: { row: Row<Worker> }) => {
          const amount = parseFloat(row.getValue('salary'))
          const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'RON'
          }).format(amount)

          return <div className='text-center font-medium'>{formatted}</div>
        },
        size: 150
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }: { row: Row<Worker> }) => {
          const worker = row.original

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-8 w-8 p-0'>
                  <span className='sr-only'>Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(worker.id)}>
                  Copy worker ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedWorker(worker)}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteWorker(worker)}
                  className='text-red-600'
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        size: 80
      }
    ],
    []
  )

  // Create table instance
  const table = useReactTable({
    data: workers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      return Object.values(row.original).some(value => {
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(nestedValue =>
            String(nestedValue).toLowerCase().includes(search)
          )
        }
        return String(value).toLowerCase().includes(search)
      })
    },
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter
    }
  })

  // Simplified handler functions
  const handleDeleteWorker = (worker: Worker) => {
    setWorkerToDelete(worker)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (workerToDelete) {
      deleteWorker(workerToDelete.id)
      refreshTable()
    }
    setDeleteConfirmOpen(false)
  }

  const handleDeleteMultiple = () => {
    const selectedIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id)
    deleteWorkers(selectedIds)
    setRowSelection({})
    refreshTable(1)
    setDeleteMultipleConfirmOpen(false)
  }

  const handleAddWorker = async (worker: Worker) => {
    await addWorker(worker)
    setAddDialogOpen(false)
    refreshTable(1)
  }

  const handleEditWorker = async (worker: Worker) => {
    await updateWorker(worker)
    setSelectedWorker(null)
    refreshTable()
  }

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const updatedFilters = {
      ...tempFilters,
      [name]:
        value === ''
          ? undefined
          : name.includes('Age') || name.includes('Salary')
            ? Number(value)
            : value
    }

    setTempFilters(updatedFilters)
  }

  const handleApplyFilters = () => {
    updateFilters(tempFilters)
    setFilterPopoverOpen(false)
    refreshTable(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleSearch = () => {
    const updatedFilters = searchTerm.trim()
      ? { ...filters, search: searchTerm.trim() }
      : { ...filters }

    if (!searchTerm.trim()) delete updatedFilters.search

    updateFilters(updatedFilters)
    refreshTable(1)
  }

  // Helper functions
  const updateFilters = (updatedFilters: WorkerFilters) => {
    setFilters(updatedFilters)
    setStoreFilters(updatedFilters)
  }

  const resetFilters = () => {
    setTempFilters({})
    updateFilters({})
    setFilterPopoverOpen(false)
    refreshTable(1)
  }

  const refreshTable = (page = pagination.page) => {
    fetchWorkers(filters, page, pagination.pageSize)
  }

  // Filter fields for popover
  const filterFields = [
    { id: 'minAge', label: 'Min Age', type: 'number' },
    { id: 'maxAge', label: 'Max Age', type: 'number' },
    { id: 'minSalary', label: 'Min Salary', type: 'number' },
    { id: 'maxSalary', label: 'Max Salary', type: 'number' },
    { id: 'position', label: 'Position', type: 'text' }
  ]

  // Network status badge
  const NetworkStatusBadge = () => {
    if (networkStatus === 'offline') {
      return (
        <Badge variant='destructive' className='ml-3 flex items-center gap-1'>
          <WifiOff className='h-3 w-3' />
          <span>Offline</span>
        </Badge>
      )
    } else if (networkStatus === 'server-down') {
      return (
        <Badge variant='destructive' className='ml-3 flex items-center gap-1'>
          <Server className='h-3 w-3' />
          <span>Server Down</span>
        </Badge>
      )
    } else {
      return (
        <Badge variant='outline' className='ml-3 flex items-center gap-1'>
          <Wifi className='h-3 w-3' />
          <span>Online</span>
        </Badge>
      )
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className='flex items-center py-4'>
        {/* Network status */}
        <NetworkStatusBadge />

        {/* Search */}
        <div className='flex max-w-sm items-center'>
          <Input
            placeholder='Search workers...'
            value={searchTerm}
            onChange={e => handleSearchChange(e.target.value)}
            className='rounded-r-none'
          />
          <Button variant='outline' className='rounded-l-none border-l-0' onClick={handleSearch}>
            <Search className='h-4 w-4' />
          </Button>
        </div>

        {/* Refresh button */}
        <Button
          className='ml-3'
          variant='outline'
          onClick={() => {
            resetFilters()
            setSearchTerm('')
            setRowSelection({})
            setGlobalFilter('')
            setSorting([])
            setColumnVisibility({})
            setFilters({})
            setTempFilters({})
            setStoreFilters({})
            setFilterPopoverOpen(false)
            refreshTable(1)
          }}
          disabled={loadingState === 'loading'}
        >
          <RefreshCcwDot className='h-4 w-4' />
        </Button>

        {/* Filter Button */}
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button className='ml-3' variant='outline'>
              <Filter className='mr-2 h-4 w-4' />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-80'>
            <div className='grid gap-4'>
              <div className='space-y-2'>
                <h4 className='font-medium leading-none'>Filter Workers</h4>
                <p className='text-muted-foreground text-sm'>
                  Set filters to find specific workers
                </p>
              </div>
              <div className='grid gap-2'>
                {filterFields.map(field => (
                  <div key={field.id} className='grid grid-cols-3 items-center gap-4'>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      className='col-span-2'
                      value={tempFilters[field.id as keyof WorkerFilters] || ''}
                      onChange={handleFilterChange}
                    />
                  </div>
                ))}
              </div>
              <div className='flex justify-between'>
                <Button variant='outline' onClick={resetFilters}>
                  Reset Filters
                </Button>
                <Button onClick={handleApplyFilters}>Apply Filters</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Add worker dialog trigger */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className='ml-3' variant='outline'>
              <Plus className='mr-2 h-4 w-4' />
              Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a worker</DialogTitle>
              <DialogDescription>Add a worker to the database.</DialogDescription>
            </DialogHeader>
            <AddWorkerForm onAddWorker={handleAddWorker} />
          </DialogContent>
        </Dialog>

        {/* Delete selected button */}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <Button
            className='text-foreground ml-3 bg-red-600 hover:bg-red-700'
            onClick={() => setDeleteMultipleConfirmOpen(true)}
          >
            Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
          </Button>
        )}

        {/* Column visibility dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' className='ml-auto'>
              Columns <ChevronDown className='ml-2 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {table
              .getAllColumns()
              .filter(column => column.getCanHide())
              .map(column => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={column.getIsVisible()}
                  onCheckedChange={value => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className='text-center'
                    style={{ width: `${header.column.getSize()}px` }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loadingState === 'loading' && workers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  <div className='flex flex-col items-center justify-center'>
                    <div className='mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900'></div>
                    <div>Loading workers...</div>
                  </div>
                </TableCell>
              </TableRow>
            ) : loadingState === 'error' ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  <div className='text-red-500'>
                    Error loading workers.{' '}
                    {networkStatus === 'offline'
                      ? 'You are offline.'
                      : networkStatus === 'server-down'
                        ? 'Server is down.'
                        : ''}
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className='hover:bg-muted/30'>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} style={{ width: `${cell.column.getSize()}px` }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Load more trigger for infinite scrolling */}
      {pagination.hasMore && (
        <div ref={loadMoreRef} className='py-4 text-center'>
          {loadingState === 'loading' ? (
            <div className='text-muted-foreground'>Loading more workers...</div>
          ) : (
            <div className='text-muted-foreground'>Scroll to load more</div>
          )}
        </div>
      )}

      {/* Pagination info */}
      <div className='flex items-center justify-end space-x-2 py-4'>
        <div className='text-muted-foreground flex-1 text-sm'>
          {table.getFilteredSelectedRowModel().rows.length} of {pagination.total} row(s) selected.
        </div>
        <div className='flex items-center space-x-2'>
          <span className='text-muted-foreground text-sm'>
            Showing {workers.length} of {pagination.total} workers
          </span>
        </div>
      </div>

      {/* Dialogs */}
      {/* Edit worker dialog */}
      <Dialog open={!!selectedWorker} onOpenChange={open => !open && setSelectedWorker(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit worker</DialogTitle>
            <DialogDescription>Modify worker information.</DialogDescription>
          </DialogHeader>
          {selectedWorker && (
            <EditWorkerForm worker={selectedWorker} onEditWorker={handleEditWorker} />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title='Delete worker'
        description={`Are you sure you want to delete ${workerToDelete?.name}? This action cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
      />

      <ConfirmationDialog
        isOpen={deleteMultipleConfirmOpen}
        onClose={() => setDeleteMultipleConfirmOpen(false)}
        onConfirm={handleDeleteMultiple}
        title='Delete multiple workers'
        description={`Are you sure you want to delete ${table.getFilteredSelectedRowModel().rows.length} workers? This action cannot be undone.`}
        confirmText='Delete All'
        variant='destructive'
      />
    </>
  )
}
