import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'type'> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  type?: HTMLButtonElement['type']
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md',
  secondary: 'border border-border text-text-secondary hover:border-border-hover hover:bg-surface-hover',
  ghost: 'text-text-muted hover:text-text-secondary hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm hover:shadow-md hover:shadow-danger/20',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    type,
    className = '',
    ...props
  }, ref) => {
    const sizeClasses = size === 'sm'
      ? 'px-3 py-1 text-xs'
      : 'px-4 py-1.5 text-sm'

    return (
      <button
        ref={ref}
        type={type}
        className={`btn ${variantStyles[variant]} ${sizeClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {icon && iconPosition === 'left' && <span className="text-current">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="text-current">{icon}</span>}
      </button>
    )
  },
)

Button.displayName = 'Button'
