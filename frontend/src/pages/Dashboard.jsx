import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Users, FolderKanban, Server, Activity, ArrowUpRight } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [usersRes, projectsRes, resourcesRes, logsRes] = await Promise.all([
          api.get('/users'),
          api.get(`/projects?userId=${user.userId}`),
          api.get(`/resources?userId=${user.userId}`),
          api.get('/audit'),
        ])

        const allUsers = usersRes.data || []
        const projects = projectsRes.data || []
        const resources = resourcesRes.data || []

        const resourcesByType = resources.reduce((acc, item) => {
          const key = item.resourceType || 'UNKNOWN'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})

        const resourcesByStatus = resources.reduce((acc, item) => {
          const key = item.status || 'UNKNOWN'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})

        const projectsByStatus = projects.reduce((acc, item) => {
          const key = item.status || 'UNKNOWN'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})

        setStats({
          totalUsers: allUsers.length,
          totalProjects: projects.length,
          totalResources: resources.length,
          activeResources: (resourcesByStatus.PROVISIONED || 0) + (resourcesByStatus.ACTIVE || 0),
          resourcesByType,
          resourcesByStatus,
          projectsByStatus,
        })

        setLogs((logsRes.data || []).slice(0, 15))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user.userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'from-indigo-500 to-purple-500', link: '/users' },
    { label: 'Projects', value: stats?.totalProjects || 0, icon: FolderKanban, color: 'from-cyan-500 to-blue-500', link: '/projects' },
    { label: 'Resources', value: stats?.totalResources || 0, icon: Server, color: 'from-emerald-500 to-teal-500', link: '/resources' },
    { label: 'Active Resources', value: stats?.activeResources || 0, icon: Activity, color: 'from-amber-500 to-orange-500', link: '/resources' },
  ]

  const resourceTypeData = Object.entries(stats?.resourcesByType || {}).map(([name, value]) => ({ name, value }))
  const resourceStatusData = Object.entries(stats?.resourcesByStatus || {}).map(([name, value]) => ({ name, value }))
  const projectStatusData = Object.entries(stats?.projectsByStatus || {}).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-muted text-sm mt-1">Here's an overview of your platform</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          System Operational
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="group bg-dark border border-border/30 rounded-xl p-5 hover:border-primary/40 transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-muted mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Resources by Type</h3>
          {resourceTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={resourceTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {resourceTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm text-center py-8">No resources yet</p>
          )}
        </div>

        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Resources by Status</h3>
          {resourceStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={resourceStatusData}>
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm text-center py-8">No data</p>
          )}
        </div>

        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Projects by Status</h3>
          {projectStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={projectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {projectStatusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted text-sm text-center py-8">No projects yet</p>
          )}
        </div>
      </div>

      <div className="bg-dark border border-border/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
          <Link to="/audit-log" className="text-xs text-primary hover:text-primary-light transition-colors">
            View All
          </Link>
        </div>
        <div className="space-y-2">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface/30 transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-success" />
              <span className="text-xs text-muted flex-shrink-0 w-28 hidden sm:block">
                {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-xs font-medium text-gray-300 flex-shrink-0">{log.actorName || 'System'}</span>
              <span className="text-xs text-muted truncate">{log.details}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-muted text-sm text-center py-4">No recent activity</p>}
        </div>
      </div>
    </div>
  )
}
