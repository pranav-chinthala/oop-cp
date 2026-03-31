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
  const [loading, setLoading] = useState(true)

  const fetchResource = () => {
    api
      .get(`/resources/${id}?viewerId=${currentUser.userId}`)
      .then((res) => setResource(res.data))
      .catch(() => navigate('/resources'))
      .finally(() => setLoading(false))
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
      </div>
    </div>
  )
}
