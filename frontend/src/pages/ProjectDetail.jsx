import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Save, Plus, Trash2, Search } from 'lucide-react'

const STATUS_OPTIONS = ['INITIATED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [project, setProject] = useState(null)
  const [resources, setResources] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [candidateUsers, setCandidateUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStatus, setEditStatus] = useState('INITIATED')

  const canManage = currentUser?.isSuperAdmin || currentUser?.role === 'PROJECT_MANAGER'

  const load = async () => {
    setLoading(true)
    try {
      const [projectRes, resourceRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/resources?userId=${currentUser.userId}`),
      ])

      const projectData = projectRes.data
      setProject(projectData)
      setEditName(projectData.name || '')
      setEditDescription(projectData.description || '')
      setEditStatus(projectData.status || 'INITIATED')

      setResources((resourceRes.data || []).filter((resource) => resource.projectId === Number(id)))
    } catch {
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id, currentUser.userId])

  useEffect(() => {
    const run = async () => {
      const term = memberSearch.trim()
      if (!term || !canManage) {
        setCandidateUsers([])
        return
      }

      try {
        const res = await api.get(`/users?emailLike=${encodeURIComponent(term)}`)
        setCandidateUsers(res.data || [])
      } catch {
        setCandidateUsers([])
      }
    }

    const timer = setTimeout(run, 250)
    return () => clearTimeout(timer)
  }, [memberSearch, canManage])

  const existingMemberIds = useMemo(() => new Set((project?.members || []).map((member) => member.userId)), [project])

  const filteredCandidates = useMemo(
    () =>
      candidateUsers.filter(
        (user) => !existingMemberIds.has(user.id) && user.role !== 'PENDING' && user.role !== 'DENIED',
      ),
    [candidateUsers, existingMemberIds],
  )

  const saveProject = async () => {
    setSaving(true)
    setSaveMessage('')
    setSaveError('')
    try {
      await api.patch(`/projects/${id}`, {
        actorId: currentUser.userId,
        name: editName,
        description: editDescription,
        status: editStatus,
      })
      await load()
      setSaveMessage('Project updated successfully')
    } catch (error) {
      setSaveError(error?.response?.data?.message || error?.response?.data?.error || 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const addMember = async (userId) => {
    await api.post(`/projects/${id}/members`, {
      userId,
      addedBy: currentUser.userId,
      role: 'Member',
    })
    setMemberSearch('')
    setCandidateUsers([])
    await load()
  }

  const removeMember = async (userId) => {
    if (!confirm('Remove this member from the project?')) return
    await api.delete(`/projects/${id}/members/${userId}`)
    await load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <div className="bg-dark border border-border/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-white">Project Details</h1>
          {canManage && (
            <button
              type="button"
              onClick={saveProject}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Updates
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Project Name</label>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                disabled={!canManage}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={4}
                disabled={!canManage}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm disabled:opacity-60 resize-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Info label="Created By" value={project.createdByName} />
            <Info label="Created At" value={project.createdAt ? new Date(project.createdAt).toLocaleString() : 'N/A'} />
            <Info label="Finished At" value={project.finishedAt ? new Date(project.finishedAt).toLocaleString() : 'N/A'} />
            <Info label="Cancelled At" value={project.cancelledAt ? new Date(project.cancelledAt).toLocaleString() : 'N/A'} />
            <div className="p-3 rounded-lg bg-surface/30 border border-border/20">
              <p className="text-[11px] text-muted mb-1">Status</p>
              <select
                value={editStatus}
                onChange={(event) => setEditStatus(event.target.value)}
                disabled={!canManage}
                className="w-full px-2 py-1.5 rounded bg-surface border border-border text-white text-sm disabled:opacity-60"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {saveMessage && <p className="text-xs text-green-400">{saveMessage}</p>}
        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
      </div>

      <div className="bg-dark border border-border/30 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Project Members</h2>

        {canManage && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search by email to add member"
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface border border-border text-white text-sm"
              />
            </div>
            {memberSearch.trim() && (
              <div className="max-h-44 overflow-y-auto border border-border/20 rounded-lg">
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between px-3 py-2 bg-surface/20 border-b border-border/10 last:border-b-0">
                    <div>
                      <p className="text-sm text-gray-200">{candidate.name}</p>
                      <p className="text-xs text-muted">{candidate.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addMember(candidate.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-primary/20 text-primary-light text-xs hover:bg-primary/30"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                ))}
                {filteredCandidates.length === 0 && <p className="text-xs text-muted p-3">No matching users</p>}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {(project.members || []).map((member) => (
            <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg bg-surface/20 border border-border/20">
              <button type="button" onClick={() => navigate(`/users/${member.userId}`)} className="text-left">
                <p className="text-sm text-gray-200">{member.name}</p>
                <p className="text-xs text-muted">{member.email} • {member.role}</p>
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => removeMember(member.userId)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-danger hover:bg-danger/10"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {(!project.members || project.members.length === 0) && <p className="text-sm text-muted">No members</p>}
        </div>
      </div>

      <div className="bg-dark border border-border/30 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Resources</h2>
        <div className="space-y-2">
          {resources.map((resource) => (
            <button
              type="button"
              key={resource.id}
              onClick={() => navigate(`/resources/${resource.id}`)}
              className="w-full text-left p-3 rounded-lg bg-surface/20 border border-border/20 hover:border-primary/40 transition-colors"
            >
              <p className="text-sm text-gray-200">{resource.name}</p>
              <p className="text-xs text-muted">{resource.resourceType} • {resource.status}</p>
            </button>
          ))}
          {resources.length === 0 && <p className="text-sm text-muted">No resources</p>}
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-surface/30 border border-border/20">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm text-gray-200">{value || 'N/A'}</p>
    </div>
  )
}
