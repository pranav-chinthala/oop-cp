import { useState } from 'react'
import api from '../api'
import { Cloud, Play, Trash2, Server, Database, Globe, HardDrive, RefreshCw } from 'lucide-react'

const AWS_SERVICES = [
  { id: 'EC2', name: 'EC2 Instance', icon: Server, desc: 'Virtual server in the cloud' },
  { id: 'S3', name: 'S3 Bucket', icon: HardDrive, desc: 'Scalable object storage' },
  { id: 'RDS', name: 'RDS Database', icon: Database, desc: 'Managed relational database' },
  { id: 'LAMBDA', name: 'Lambda Function', icon: Play, desc: 'Serverless compute' },
  { id: 'VPC', name: 'VPC Network', icon: Globe, desc: 'Virtual private cloud' },
]

const AWS_ACTIONS = ['PROVISION', 'DECOMMISSION', 'DESCRIBE', 'LIST', 'START', 'STOP']

export default function AwsEmulator() {
  const [service, setService] = useState('EC2')
  const [action, setAction] = useState('PROVISION')
  const [resourceName, setResourceName] = useState('')
  const [params, setParams] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])

  const handleExecute = async () => {
    setLoading(true)
    try {
      let additionalParams = {}
      if (params.trim()) {
        try {
          additionalParams = JSON.parse(params)
        } catch {
          additionalParams = { raw: params }
        }
      }
      const res = await api.post('/emulator/aws', {
        service,
        action,
        resourceName: resourceName || undefined,
        parameters: additionalParams,
      })
      setResponse(res.data)
      setHistory((prev) => [{ service, action, resourceName, time: new Date(), success: !!res.data.success }, ...prev.slice(0, 19)])
    } catch (err) {
      setResponse({
        success: false,
        message: err.response?.data?.message || 'AWS emulator endpoint is not available on current backend',
        output: {},
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AWS Emulator</h1>
          <p className="text-muted text-sm mt-1">Simulated AWS resource management console</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface text-sm text-gray-300 hover:text-white hover:bg-border transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {AWS_SERVICES.map((svc) => (
          <button
            key={svc.id}
            onClick={() => setService(svc.id)}
            className={`p-4 rounded-xl border transition-all text-left ${service === svc.id ? 'bg-primary/10 border-primary/50' : 'bg-dark border-border/30 hover:border-primary/30'}`}
          >
            <svc.icon className={`w-5 h-5 mb-2 ${service === svc.id ? 'text-primary' : 'text-muted'}`} />
            <p className={`text-xs font-semibold ${service === svc.id ? 'text-white' : 'text-gray-300'}`}>{svc.name}</p>
            <p className="text-[10px] text-muted mt-0.5">{svc.desc}</p>
          </button>
        ))}
      </div>

      <div className="bg-dark border border-border/30 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Cloud className="w-4 h-4 text-primary" /> Execute AWS Operation
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary">
              {AWS_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Resource Name / ARN</label>
            <input
              type="text"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder={action === 'PROVISION' ? 'my-resource-name' : 'arn:aws:...'}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Parameters (JSON)</label>
            <input
              type="text"
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder='{"key": "value"}'
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <button
          onClick={handleExecute}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Play className="w-4 h-4" />}
          Execute
        </button>
      </div>

      {response && (
        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold text-white">Response</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${response.success ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
              {response.success ? 'Success' : 'Error'}
            </span>
          </div>
          {response.message && <p className="text-sm text-gray-300 mb-3">{response.message}</p>}
          {response.output && Object.keys(response.output).length > 0 && (
            <div className="rounded-lg bg-surface/30 p-4 overflow-auto max-h-64">
              <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{JSON.stringify(response.output, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Operation History</h3>
          <div className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface/30 transition-colors">
                <div className={`w-2 h-2 rounded-full ${h.success ? 'bg-success' : 'bg-danger'}`} />
                <span className="text-xs font-medium text-primary w-16">{h.service}</span>
                <span className="text-xs text-gray-300 w-24">{h.action}</span>
                <span className="text-xs text-muted truncate flex-1 font-mono">{h.resourceName || '-'}</span>
                <span className="text-[10px] text-muted">{h.time.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
