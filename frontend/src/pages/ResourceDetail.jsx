import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Server, Wifi, Network } from 'lucide-react'

const typeIcons = { SERVER: Server, ROUTER: Wifi, SWITCH: Network }
const statusColors = {
  PROVISIONED: 'bg-green-500/15 text-green-400 border-green-500/30',
  MAINTENANCE: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  DECOMMISSIONED: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
}

export default function ResourceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [resource, setResource] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingPermission, setSavingPermission] = useState(false)
  const [permissionError, setPermissionError] = useState('')
  const [permissionMessage, setPermissionMessage] = useState('')
  const [permissionForm, setPermissionForm] = useState({ userId: '', canAccess: true, canGrantAccess: false })

  const fetchResource = async () => {
    try {
      const [resourceRes, usersRes] = await Promise.all([
        api.get(`/resources/${id}?viewerId=${currentUser.userId}`),
        api.get('/users'),
      ])
      setResource(resourceRes.data)
      setUsers(usersRes.data || [])
    } catch {
      navigate('/resources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResource()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  if (!resource) return null

  const Icon = typeIcons[(resource.resourceType || '').toUpperCase()] || Server
  const myPermission = (resource.permissions || []).find((permission) => permission.userId === currentUser.userId)
  const canManagePermissions = !!currentUser?.isSuperAdmin || !!myPermission?.canGrantAccess
  const usersWithoutPermission = users.filter((user) => !(resource.permissions || []).some((permission) => permission.userId === user.id))

  const submitPermission = async (event) => {
    event.preventDefault()
    setPermissionError('')
    setPermissionMessage('')

    if (!permissionForm.userId) {
      setPermissionError('Select a user to grant access')
      return
    }

    setSavingPermission(true)
    try {
      const payload = {
        userId: Number(permissionForm.userId),
        grantedBy: currentUser.userId,
        canAccess: permissionForm.canAccess,
        canGrantAccess: permissionForm.canGrantAccess,
      }
      await api.post(`/resources/${id}/permissions`, payload)
      setPermissionMessage('Resource access updated')
      setPermissionForm({ userId: '', canAccess: true, canGrantAccess: false })
      fetchResource()
    } catch (error) {
      setPermissionError(error.response?.data?.message || 'Failed to update access')
    } finally {
      setSavingPermission(false)
    }
  }

  const setExistingPermission = async (permission, updates) => {
    setPermissionError('')
    setPermissionMessage('')
    try {
      await api.post(`/resources/${id}/permissions`, {
        userId: permission.userId,
        grantedBy: currentUser.userId,
        canAccess: updates.canAccess,
        canGrantAccess: updates.canGrantAccess,
      })
      setPermissionMessage('Resource access updated')
      fetchResource()
    } catch (error) {
      setPermissionError(error.response?.data?.message || 'Failed to update access')
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/resources')} className="flex items-center gap-2 text-sm text-muted hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Resources
      </button>

      <div className="bg-dark border border-border/30 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Icon className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">{resource.name}</h1>
                <p className="text-sm text-muted mt-1">{resource.resourceType || 'UNKNOWN'} • {resource.projectName}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[resource.status] || 'bg-gray-500/15 text-gray-400'}`}>
                {resource.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Core Details</h3>
          <div className="space-y-3">
            {[
              ['Resource ID', resource.id],
              ['Project', resource.projectName],
              ['Created By', resource.createdByName],
              ['Created At', new Date(resource.createdAt).toLocaleString()],
            ].map(([key, val]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                <span className="text-xs text-muted">{key}</span>
                <span className="text-sm text-gray-300">{val || '-'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Services</h3>
          <div className="space-y-2">
            {(resource.services || []).map((service) => (
              <div key={service.id} className="p-3 rounded-lg bg-surface/30 border border-border/20">
                <p className="text-xs text-gray-200 font-medium">{service.protocol} • {service.ipAddress}:{service.port}</p>
                <p className="text-[10px] text-muted mt-1">{service.metadata || 'No metadata'}</p>
              </div>
            ))}
            {(!resource.services || resource.services.length === 0) && <p className="text-sm text-muted">No services configured</p>}
          </div>
        </div>

        <div className="bg-dark border border-border/30 rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">API Endpoints</h3>
          <div className="space-y-2">
            {(resource.apiEndpoints || []).map((endpoint) => (
              <div key={endpoint.id} className="p-3 rounded-lg bg-surface/30 border border-border/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-200 font-medium">{endpoint.httpMethod} • {endpoint.name}</p>
                  <span className="text-[10px] text-muted">{endpoint.projectWideAccess ? 'Project-wide' : 'Restricted'}</span>
                </div>
                <p className="text-[10px] text-primary mt-1 break-all">{endpoint.url}</p>
              </div>
            ))}
            {(!resource.apiEndpoints || resource.apiEndpoints.length === 0) && <p className="text-sm text-muted">No API endpoints configured</p>}
          </div>
        </div>

        <div className="bg-dark border border-border/30 rounded-xl p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Resource Access</h3>
          <div className="space-y-2 mb-4">
            {(resource.permissions || []).map((permission) => (
              <div key={permission.id} className="p-3 rounded-lg bg-surface/30 border border-border/20 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-200 font-medium">{permission.userName}</p>
                  <p className="text-[10px] text-muted">
                    Access: {permission.canAccess ? 'Granted' : 'Revoked'} • Delegation: {permission.canGrantAccess ? 'Allowed' : 'Blocked'}
                  </p>
                </div>
                {canManagePermissions && permission.userId !== currentUser.userId && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExistingPermission(permission, { canAccess: !permission.canAccess, canGrantAccess: permission.canGrantAccess && !permission.canAccess ? permission.canGrantAccess : permission.canGrantAccess })}
                      className="px-2 py-1 rounded text-[10px] bg-surface text-gray-300 hover:bg-border"
                    >
                      {permission.canAccess ? 'Revoke Access' : 'Grant Access'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExistingPermission(permission, { canAccess: permission.canAccess, canGrantAccess: !permission.canGrantAccess })}
                      className="px-2 py-1 rounded text-[10px] bg-primary/20 text-primary-light hover:bg-primary/30"
                    >
                      {permission.canGrantAccess ? 'Remove Grant Right' : 'Allow Grant Right'}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {(!resource.permissions || resource.permissions.length === 0) && <p className="text-sm text-muted">No explicit permissions configured</p>}
          </div>

          {permissionError && <div className="mb-3 p-2 rounded bg-danger/10 border border-danger/30 text-danger text-xs">{permissionError}</div>}
          {permissionMessage && <div className="mb-3 p-2 rounded bg-success/10 border border-success/30 text-green-400 text-xs">{permissionMessage}</div>}

          {canManagePermissions ? (
            <form onSubmit={submitPermission} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">User</label>
                <select
                  value={permissionForm.userId}
                  onChange={(event) => setPermissionForm((state) => ({ ...state, userId: event.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
                >
                  <option value="">Select user</option>
                  {usersWithoutPermission.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={permissionForm.canAccess}
                    onChange={(event) => setPermissionForm((state) => ({ ...state, canAccess: event.target.checked }))}
                    className="accent-primary"
                  />
                  Can access resource
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={permissionForm.canGrantAccess}
                    onChange={(event) => setPermissionForm((state) => ({ ...state, canGrantAccess: event.target.checked }))}
                    className="accent-primary"
                  />
                  Can grant access to others
                </label>
              </div>
              <button
                type="submit"
                disabled={savingPermission || !permissionForm.userId}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingPermission ? 'Saving...' : 'Grant Permission'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted">You do not have permission to grant or update resource access for this resource.</p>
          )}
        </div>
      </div>
    </div>
  )
}
