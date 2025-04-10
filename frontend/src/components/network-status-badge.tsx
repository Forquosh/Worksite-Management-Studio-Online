import { useNetworkStatus } from '@/store/network-status'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Server } from 'lucide-react'

export function NetworkStatusBadge() {
  const { status } = useNetworkStatus()

  if (status === 'offline') {
    return (
      <Badge variant='destructive' className='flex items-center gap-1'>
        <WifiOff className='h-3 w-3' />
        <span>Offline</span>
      </Badge>
    )
  }

  if (status === 'server-down') {
    return (
      <Badge variant='destructive' className='flex items-center gap-1'>
        <Server className='h-3 w-3' />
        <span>Server Down</span>
      </Badge>
    )
  }

  return (
    <Badge variant='outline' className='flex items-center gap-1'>
      <Wifi className='h-3 w-3' />
      <span>Online</span>
    </Badge>
  )
}
