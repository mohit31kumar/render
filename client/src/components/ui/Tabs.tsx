import { type ReactNode, type HTMLAttributes } from 'react'

interface Tab {
  key: string
  label: ReactNode
  disabled?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ tabs, activeKey, onChange, className = '', ...props }: TabsProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={className} {...props}>
      <div className="tab-list">
        {tabs.map((tab) => {
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => !tab.disabled && onChange(tab.key)}
              disabled={tab.disabled}
              className={`tab-item ${isActive ? 'tab-item-active' : 'tab-item-inactive'} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
