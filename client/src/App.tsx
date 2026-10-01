import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Server, Rocket, FileText, Activity, Settings } from 'lucide-react'
import { StatusIndicator } from './components/ui/StatusIndicator'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/services', label: 'Services', icon: Server },
  { to: '/deployments', label: 'Deployments', icon: Rocket },
  { to: '/logs', label: 'Logs', icon: FileText },
  { to: '/metrics', label: 'Metrics', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function App() {
  const location = useLocation()

  return (
    <div className="flex h-screen w-full bg-bg text-text-secondary">
      <aside className="flex w-56 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-sm font-semibold tracking-wide text-text-primary">
            Render Monitor
          </h1>
          <p className="mt-0.5 text-xs text-text-muted">Infrastructure</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-fast ${
                  isActive
                    ? 'bg-primary/10 text-text-primary shadow-glow'
                    : 'text-text-muted hover:bg-surface-hover hover:text-text-secondary'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-primary' : ''} />
                <span className="font-medium">{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-border px-4 py-3">
          <StatusIndicator status="live" size="sm" />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
