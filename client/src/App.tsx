import { Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Server, Rocket, FileText, Activity, Settings } from 'lucide-react'

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
    <div className="flex h-screen w-full bg-gray-950 text-gray-200">
      <aside className="flex w-56 flex-col border-r border-gray-800 bg-gray-900">
        <div className="border-b border-gray-800 px-4 py-4">
          <h1 className="text-sm font-semibold tracking-wide text-gray-100">
            Render Control Center
          </h1>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                  isActive
                    ? 'bg-gray-800 text-gray-100'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
