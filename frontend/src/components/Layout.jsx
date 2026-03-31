import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Server,
  Terminal,
  Globe,
  Cloud,
  FileText,
  LogOut,
  Menu,
  Shield,
  ChevronDown,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/resources', icon: Server, label: 'Resources' },
]

const emulatorItems = [
  { to: '/emulator/http', icon: Globe, label: 'HTTP Client' },
  { to: '/emulator/ssh', icon: Terminal, label: 'SSH Terminal' },
  { to: '/emulator/aws', icon: Cloud, label: 'AWS Console' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [emulatorOpen, setEmulatorOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-primary/15 text-primary-light border-l-3 border-primary'
        : 'text-gray-400 hover:text-white hover:bg-white/5'
    }`

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">RMACS</h1>
            <p className="text-[10px] text-muted tracking-wider uppercase">Access Control</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-[10px] font-semibold text-muted uppercase tracking-wider">Main</p>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={() => setSidebarOpen(false)}>
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        <div className="pt-4">
          <button
            onClick={() => setEmulatorOpen(!emulatorOpen)}
            className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-semibold text-muted uppercase tracking-wider hover:text-white transition-colors"
          >
            <span>Emulators</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${emulatorOpen ? 'rotate-180' : ''}`} />
          </button>
          {emulatorOpen &&
            emulatorItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} onClick={() => setSidebarOpen(false)}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
        </div>

        <div className="pt-4">
          <p className="px-4 py-2 text-[10px] font-semibold text-muted uppercase tracking-wider">System</p>
          <NavLink to="/audit-log" className={linkClass} onClick={() => setSidebarOpen(false)}>
            <FileText className="w-4 h-4" />
            Audit Log
          </NavLink>
        </div>
      </nav>

      <div className="p-4 border-t border-border/50">
        <button
          type="button"
          onClick={() => {
            setSidebarOpen(false)
            if (user?.userId) navigate(`/users/${user.userId}`)
          }}
          className="flex items-center gap-3 mb-3 w-full text-left rounded-lg p-1 hover:bg-surface/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-muted truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-darker text-white">
      <aside className="hidden lg:block w-64 bg-dark border-r border-border/30 flex-shrink-0">
        <Sidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-dark">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-dark/50 backdrop-blur-xl border-b border-border/30 flex items-center px-4 lg:px-8 flex-shrink-0">
          <button className="lg:hidden mr-4 text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <span
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                user?.isSuperAdmin
                  ? 'bg-danger/20 text-red-400'
                  : user?.role === 'PROJECT_MANAGER'
                    ? 'bg-primary/20 text-primary-light'
                    : 'bg-surface text-muted'
              }`}
            >
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
