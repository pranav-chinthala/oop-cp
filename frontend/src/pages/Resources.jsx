import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Server, Wifi, Network, X } from 'lucide-react'

const typeIcons = { SERVER: Server, ROUTER: Wifi, SWITCH: Network }
const statusColors = {
  PROVISIONED: 'bg-green-500/15 text-green-400',
  MAINTENANCE: 'bg-amber-500/15 text-amber-400',
  DECOMMISSIONED: 'bg-gray-500/15 text-gray-400',
}

export default function Resources() {
  const { user: currentUser } = useAuth()
  const [resources, setResources] = useState([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'SERVER', projectId: '' })
  const [projects, setProjects] = useState([])
  const [error, setError] = useState('')

  const canProvision = currentUser?.isSuperAdmin || currentUser?.role === 'PROJECT_MANAGER'

  const fetchResources = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/resources?userId=${currentUser.userId}`)
      setResources(res.data || [])
    } catch {
      setResources([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [currentUser.userId])

  const filtered = useMemo(() => {
    return resources.filter((res) => {
      const term = search.trim().toLowerCase()
      const matchesSearch = !term || res.name?.toLowerCase().includes(term) || res.resourceType?.toLowerCase().includes(term)
      const matchesType = !typeFilter || (res.resourceType || '').toUpperCase() === typeFilter
      const matchesStatus = !statusFilter || (res.status || '').toUpperCase() === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [resources, search, typeFilter, statusFilter])

  const openCreate = async () => {
    setShowModal(true)
    try {
      const res = await api.get(`/projects?userId=${currentUser.userId}`)
      setProjects(res.data || [])
    } catch {
      setProjects([])
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/resources', {
        name: form.name,
        projectId: Number(form.projectId),
        resourceType: form.type,
        createdBy: currentUser.userId,
      })
      setShowModal(false)
      fetchResources()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to provision resource')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Resources</h1>
          <p className="text-muted text-sm mt-1">{filtered.length} resources managed</p>
        </div>
        {canProvision && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> Provision Resource
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark border border-border/50 text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-dark border border-border/50 text-gray-300 text-sm focus:outline-none focus:border-primary"
        >
          <option value="">All Types</option>
          <option value="SERVER">Server</option>
          <option value="ROUTER">Router</option>
          <option value="SWITCH">Switch</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-lg bg-dark border border-border/50 text-gray-300 text-sm focus:outline-none focus:border-primary"
        >
          <option value="">All Status</option>
          <option value="PROVISIONED">Provisioned</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="DECOMMISSIONED">Decommissioned</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((res) => {
          const Icon = typeIcons[(res.resourceType || '').toUpperCase()] || Server
          return (
            <Link
              key={res.id}
              to={`/resources/${res.id}`}
              className="bg-dark border border-border/30 rounded-xl p-5 hover:border-primary/30 transition-all group cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[res.status] || 'bg-gray-500/15 text-gray-400'}`}>
                  {res.status}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-0.5 group-hover:text-primary transition-colors">{res.name}</h3>
              <p className="text-xs text-muted mb-3">{res.resourceType || 'UNKNOWN'} • {res.projectName}</p>
              <div className="pt-3 border-t border-border/20">
                <p className="text-[10px] text-muted">Created</p>
                <p className="text-xs font-medium text-gray-300">{new Date(res.createdAt).toLocaleString()}</p>
              </div>
            </Link>
          )
        })}
      </div>
      {loading && <div className="text-center text-muted py-8">Loading...</div>}
      {!loading && filtered.length === 0 && <div className="text-center text-muted py-8">No resources found</div>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-dark border border-border/50 rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Provision Resource</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="SERVER">Server</option>
                    <option value="ROUTER">Router</option>
                    <option value="SWITCH">Switch</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Project</label>
                <select
                  value={form.projectId}
                  onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
                  required
                >
                  <option value="">Select project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 rounded-lg bg-surface text-gray-300 text-sm hover:bg-border transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors">
                  Provision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
