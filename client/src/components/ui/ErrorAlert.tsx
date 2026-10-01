import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'

interface ErrorAlertProps extends HTMLAttributes<HTMLDivElement> {
  heading?: ReactNode
  message: ReactNode
  action?: ReactNode
}

export const ErrorAlert = forwardRef<HTMLDivElement, ErrorAlertProps>(
  ({ heading, message, action, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 ${className}`}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {heading && <p className="text-sm font-medium text-danger">{heading}</p>}
            <p className="mt-0.5 text-xs text-text-secondary">{message}</p>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
    )
  },
)

ErrorAlert.displayName = 'ErrorAlert'
