import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Shield, Trash2 } from 'lucide-react'

function roleLabel(role) {
  return role ? role.replaceAll('_', ' ') : 'N/A'
}

export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [profile, setProfile] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [roleDraft, setRoleDraft] = useState('EMPLOYEE')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [profileRes, usersRes, projectsRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/users'),
        api.get(`/projects?userId=${id}`),
      ])

      const fetchedProfile = profileRes.data
      setProfile(fetchedProfile)
      setRoleDraft(fetchedProfile.role)
      setAllUsers(usersRes.data || [])
      setProjects(projectsRes.data || [])
    } catch {
      navigate('/users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const addedByUser = useMemo(() => {
    if (!profile?.addedBy) return null
    return allUsers.find((item) => item.id === profile.addedBy) || null
  }, [allUsers, profile])

  const currentProjects = projects.filter((project) => project.status === 'IN_PROGRESS')
  const upcomingProjects = projects.filter((project) => project.status === 'INITIATED')
  const pastProjects = projects.filter((project) => ['FINISHED', 'CANCELLED'].includes(project.status))

  const canManage = currentUser?.isSuperAdmin && currentUser?.userId !== Number(id)

  const onChangeRole = async () => {
    if (!profile || !canManage) return
    setSaving(true)
    try {
      await api.patch(`/users/${profile.id}/role?role=${roleDraft}&actorId=${currentUser.userId}`)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const onRemove = async () => {
    if (!profile || !canManage) return
    if (!confirm('Are you sure you want to remove this user?')) return
    setSaving(true)
    try {
      await api.delete(`/users/${profile.id}?actorId=${currentUser.userId}`)
      navigate('/users')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/users')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      <div className="bg-dark border border-border/30 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
            {profile.name?.[0] || 'U'}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <p className="text-sm text-muted mt-1">{profile.email}</p>
            <p className="text-xs text-primary mt-1">{roleLabel(profile.role)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <div className="p-3 rounded-lg bg-surface/30 border border-border/20">
            <p className="text-[11px] text-muted">User Since</p>
            <p className="text-sm text-gray-200">{profile.addedAt ? new Date(profile.addedAt).toLocaleString() : 'N/A'}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface/30 border border-border/20">
            <p className="text-[11px] text-muted">Status</p>
            <p className="text-sm text-gray-200">Active</p>
          </div>
        </div>

        {addedByUser && (
          <div className="mt-5">
            <p className="text-[11px] text-muted mb-2">Added By</p>
            <button
              type="button"
              onClick={() => navigate(`/users/${addedByUser.id}`)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white text-sm font-semibold">
                {addedByUser.name?.[0] || 'U'}
              </div>
              <span className="text-sm text-gray-200">{addedByUser.name}</span>
            </button>
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap gap-3 mt-5">
            <select
              value={roleDraft}
              onChange={(event) => setRoleDraft(event.target.value)}
              className="px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
            >
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="PROJECT_MANAGER">Project Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <button
              type="button"
              disabled={saving}
              onClick={onChangeRole}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <Shield className="w-4 h-4" /> Change Role
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onRemove}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger/15 text-danger text-sm font-medium hover:bg-danger/25 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Remove
            </button>
          </div>
        )}
      </div>

      <ProjectBucket title="Current Projects" projects={currentProjects} onOpen={(projectId) => navigate(`/projects/${projectId}`)} />
      <ProjectBucket title="Upcoming Projects" projects={upcomingProjects} onOpen={(projectId) => navigate(`/projects/${projectId}`)} />
      <ProjectBucket title="Past Projects" projects={pastProjects} onOpen={(projectId) => navigate(`/projects/${projectId}`)} />
    </div>
  )
}

function ProjectBucket({ title, projects, onOpen }) {
  return (
    <div className="bg-dark border border-border/30 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
      {projects.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => onOpen(project.id)}
              className="text-left p-3 rounded-lg bg-surface/30 border border-border/20 hover:border-primary/40 transition-colors"
            >
              <p className="text-sm text-gray-200 font-medium">{project.name}</p>
              <p className="text-[11px] text-muted mt-1">{project.status?.replace('_', ' ')}</p>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No projects</p>
      )}
    </div>
  )
}
