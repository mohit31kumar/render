import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'

type IndicatorStatus = 'live' | 'suspended' | 'building' | 'failed' | 'pending' | 'unknown'

interface StatusIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  status: IndicatorStatus
  label?: ReactNode
  size?: 'sm' | 'md'
  showDot?: boolean
  animated?: boolean
}

const statusConfig: Record<IndicatorStatus, { color: string; label: string; animated: boolean }> = {
  live: { color: 'bg-success', label: 'Live', animated: true },
  suspended: { color: 'bg-gray-500', label: 'Suspended', animated: false },
  building: { color: 'bg-warning', label: 'Building', animated: true },
  failed: { color: 'bg-danger', label: 'Failed', animated: false },
  pending: { color: 'bg-warning', label: 'Pending', animated: false },
  unknown: { color: 'bg-text-disabled', label: 'Unknown', animated: false },
}

const statusToVariant = (status: IndicatorStatus): string => {
  switch (status) {
    case 'live': return 'success'
    case 'failed': return 'danger'
    case 'building': return 'warning'
    case 'pending': return 'warning'
    default: return 'default'
  }
}

export const StatusIndicator = forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ status, label, size = 'sm', showDot = true, animated = false, className = '', ...props }, ref) => {
    const config = statusConfig[status] ?? statusConfig.unknown
    const displayLabel = label ?? config.label
    const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm'
    const pulseClass = animated && status === 'live'
      ? 'animate-status-pulse'
      : animated && status === 'failed'
        ? 'animate-status-pulse-danger'
        : ''

    return (
      <div ref={ref} className={`flex items-center gap-2 ${className}`} {...props}>
        {showDot && (
          <span className={`${dotSize} rounded-full ${config.color} ${pulseClass}`} />
        )}
        {displayLabel && (
          <span className={`${textSize} text-text-secondary`}>{displayLabel}</span>
        )}
      </div>
    )
  },
)

StatusIndicator.displayName = 'StatusIndicator'
