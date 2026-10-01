import { type ReactNode, type HTMLAttributes, forwardRef } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  leftAddon?: ReactNode
  rightAddon?: ReactNode
  type?: HTMLInputElement['type']
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, type = 'text', className = '', ...props }, ref) => {
    return (
      <div className={className}>
        {label && <label className="form-label">{label}</label>}
        <div className="relative">
          {leftAddon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
              {leftAddon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={`form-input ${leftAddon ? 'pl-9' : ''} ${rightAddon ? 'pr-9' : ''} ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            {...props}
          />
          {rightAddon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted">
              {rightAddon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  error?: ReactNode
  hint?: ReactNode
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className = '', children, value, onChange, ...props }, ref) => {
    return (
      <div className={className}>
        {label && <label className="form-label">{label}</label>}
        <select
          ref={ref}
          value={value}
          onChange={onChange}
          className={`form-select form-input ${error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
