import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'interactive'
  hoverable?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = 'default', hoverable = false, className = '', ...props }, ref) => {
    const base = 'rounded-lg border border-border bg-surface p-4 shadow-sm transition-all duration-fast'
    const variants = {
      default: '',
      elevated: 'bg-surface-elevated',
      interactive: 'bg-surface-elevated',
    }
    const hover = hoverable || variant === 'interactive'
      ? 'hover:border-border-hover hover:bg-surface-hover hover:shadow-md cursor-pointer'
      : ''

    return (
      <div
        ref={ref}
        className={`${base} ${variants[variant]} ${hover} ${className}`}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode
  value: ReactNode
  icon?: ReactNode
  trend?: ReactNode
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, icon, trend, className = '', ...props }, ref) => {
    return (
      <Card ref={ref} className={className} {...props}>
        <div className="flex items-center gap-2 text-label text-text-muted uppercase tracking-wide">
          {icon && <span className="text-text-muted">{icon}</span>}
          <span>{label}</span>
        </div>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-page text-text-primary">{value}</p>
          {trend && <span className="text-sm text-text-muted">{trend}</span>}
        </div>
      </Card>
    )
  },
)

StatCard.displayName = 'StatCard'
