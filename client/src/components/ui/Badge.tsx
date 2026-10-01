import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
  size?: 'sm' | 'md'
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-surface-hover text-text-secondary border-border',
  success: 'bg-success/15 text-success border-success/20',
  warning: 'bg-warning/15 text-warning border-warning/20',
  danger: 'bg-danger/15 text-danger border-danger/20',
  info: 'bg-info/15 text-info border-info/20',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-text-muted',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', dot = false, size = 'sm', className = '', ...props }, ref) => {
    const sizeClasses = size === 'sm'
      ? 'px-2.5 py-0.5 text-label'
      : 'px-3 py-1 text-xs'

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${variantStyles[variant]} ${sizeClasses} ${className}`}
        {...props}
      >
        {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]}`} />}
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'
