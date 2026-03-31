import { useState, useEffect } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, FolderKanban, Users as UsersIcon } from 'lucide-react'

const statusColors = {
  INITIATED: 'bg-blue-500/15 text-blue-400',
  IN_PROGRESS: 'bg-amber-500/15 text-amber-400',
  FINISHED: 'bg-green-500/15 text-green-400',
  CANCELLED: 'bg-red-500/15 text-red-400',
}

export default function Projects() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMembers, setShowMembers] = useState(null)
  const [members, setMembers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [resources, setResources] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')

  const canCreate = currentUser?.isSuperAdmin || currentUser?.role === 'PROJECT_MANAGER'

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const [projectsRes, usersRes, resourcesRes] = await Promise.all([
        api.get(`/projects?userId=${currentUser.userId}`),
        api.get('/users'),
        api.get(`/resources?userId=${currentUser.userId}`),
      ])
      const fetchedProjects = projectsRes.data || []
      setProjects(fetchedProjects)
      setAllUsers(usersRes.data || [])
      setResources(resourcesRes.data || [])
    } catch (err) {
      console.error(err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [currentUser.userId])

  const filteredProjects = projects.filter((project) => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return project.name?.toLowerCase().includes(term) || project.description?.toLowerCase().includes(term)
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/projects', {
        name: form.name,
        description: form.description,
        createdBy: currentUser.userId,
        managerUserId: currentUser.role === 'PROJECT_MANAGER' ? currentUser.userId : null,
      })
      setShowModal(false)
      setForm({ name: '', description: '' })
      fetchProjects()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project')
    }
  }

  const openMembers = async (projectId) => {
    setShowMembers(projectId)
    try {
      const detailRes = await api.get(`/projects/${projectId}`)
      setMembers(detailRes.data?.members || [])
    } catch {
      setMembers([])
    }
  }

  const handleAddMember = async (projectId, userId) => {
    try {
      await api.post(`/projects/${projectId}/members`, { userId, addedBy: currentUser.userId, role: 'Member' })
      openMembers(projectId)
      fetchProjects()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add member')
    }
  }

  const handleRemoveMember = async (projectId, memberUserId) => {
    try {
      await api.delete(`/projects/${projectId}/members/${memberUserId}`)
      openMembers(projectId)
      fetchProjects()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-muted text-sm mt-1">{filteredProjects.length} projects</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark border border-border/50 text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const projectMemberCount = members.length && showMembers === project.id ? members.length : 0
          const projectResourceCount = resources.filter((r) => r.projectId === project.id).length
          return (
            <button
              type="button"
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}`)}
              className="text-left bg-dark border border-border/30 rounded-xl p-5 hover:border-primary/30 transition-all group w-full"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-cyan-400" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[project.status] || statusColors.INITIATED}`}>
                  {project.status?.replace('_', ' ')}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white mb-1">{project.name}</h3>
              <p className="text-xs text-muted mb-4 line-clamp-2">{project.description || 'No description'}</p>
              <div className="flex items-center justify-between pt-3 border-t border-border/20">
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <UsersIcon className="w-3.5 h-3.5" /> {projectMemberCount}
                  </span>
                  <span>{projectResourceCount} resources</span>
                </div>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    openMembers(project.id)
                  }}
                  className="px-2 py-1 rounded text-[10px] text-muted hover:text-white hover:bg-surface transition-colors"
                >
                  Members
                </button>
              </div>
            </button>
          )
        })}
      </div>
      {loading && <div className="text-center text-muted py-8">Loading...</div>}
      {!loading && filteredProjects.length === 0 && <div className="text-center text-muted py-8">No projects found</div>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-dark border border-border/50 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Create Project</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Project Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary resize-none"
                />
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-dark border border-border/50 rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Project Members</h2>
              <button onClick={() => setShowMembers(null)} className="text-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              {members.map((u) => (
                <div key={u.userId} className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">{u.name?.[0]}</div>
                    <div>
                      <p className="text-sm text-white">{u.name}</p>
                      <p className="text-[10px] text-muted">{u.role}</p>
                    </div>
                  </div>
                  {canCreate && (
                    <button
                      onClick={() => handleRemoveMember(showMembers, u.userId)}
                      className="text-xs text-danger hover:bg-danger/10 px-2 py-1 rounded transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {canCreate && (
              <div>
                <p className="text-xs font-medium text-gray-400 mb-2">Add Member</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {allUsers
                    .filter((u) => !u.isSuperAdmin && !members.find((m) => m.userId === u.id))
                    .map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleAddMember(showMembers, u.id)}
                        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-surface/50 text-left transition-colors"
                      >
                        <div className="w-6 h-6 rounded bg-surface flex items-center justify-center text-muted text-[10px] font-bold">{u.name?.[0]}</div>
                        <span className="text-sm text-gray-300">{u.name}</span>
                        <Plus className="w-3 h-3 text-muted ml-auto" />
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
