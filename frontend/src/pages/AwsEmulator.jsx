import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { Cloud, Play, Server, Database, HardDrive, RefreshCw, Activity, Layers, Clock3, Wrench } from 'lucide-react'

const SERVICE_OPTIONS = [
  {
    id: 'LOCALSTACK',
    name: 'LocalStack Control Plane',
    icon: Cloud,
    desc: 'Connectivity and one-click bootstrap of reference resources.',
  },
  {
    id: 'S3',
    name: 'S3 Emulator',
    icon: HardDrive,
    desc: 'Create buckets and manage object payloads.',
  },
  {
    id: 'DYNAMODB',
    name: 'DynamoDB Emulator',
    icon: Database,
    desc: 'Create tables and read/write JSON items.',
  },
]

const ACTION_OPTIONS = {
  LOCALSTACK: ['STATUS', 'BOOTSTRAP'],
  S3: ['LIST_BUCKETS', 'CREATE_BUCKET', 'DELETE_BUCKET', 'LIST_OBJECTS', 'PUT_OBJECT', 'GET_OBJECT', 'DELETE_OBJECT'],
  DYNAMODB: ['LIST_TABLES', 'CREATE_TABLE', 'DELETE_TABLE', 'PUT_ITEM', 'GET_ITEM'],
}

const ACTION_HINTS = {
  STATUS: {
    resourcePlaceholder: 'Optional',
    params: {},
    description: 'Checks LocalStack endpoint connectivity and lists current S3 buckets and DynamoDB tables.',
  },
  BOOTSTRAP: {
    resourcePlaceholder: 'Optional',
    params: {},
    description: 'Creates reference resources from your README flow: `records` bucket and `person` table.',
  },
  LIST_BUCKETS: {
    resourcePlaceholder: 'Optional',
    params: {},
    description: 'Lists all buckets available in the LocalStack S3 emulator.',
  },
  CREATE_BUCKET: {
    resourcePlaceholder: 'records',
    params: { bucketName: 'records' },
    description: 'Creates a new S3 bucket. Provide bucket name in Resource Name or parameters.',
  },
  DELETE_BUCKET: {
    resourcePlaceholder: 'records',
    params: { bucketName: 'records' },
    description: 'Deletes an S3 bucket (must be empty before deletion).',
  },
  LIST_OBJECTS: {
    resourcePlaceholder: 'records',
    params: { bucketName: 'records' },
    description: 'Lists object keys within a selected bucket.',
  },
  PUT_OBJECT: {
    resourcePlaceholder: 'records',
    params: { bucketName: 'records', key: 'hello-v2.txt', content: 'Hello from AtlasOps AWS emulator' },
    description: 'Uploads a text object into the selected bucket.',
  },
  GET_OBJECT: {
    resourcePlaceholder: 'records',
    params: { bucketName: 'records', key: 'hello-v2.txt' },
    description: 'Reads object content by key from the selected bucket.',
  },
  DELETE_OBJECT: {
    resourcePlaceholder: 'records',
    params: { bucketName: 'records', key: 'hello-v2.txt' },
    description: 'Deletes a single object key from the bucket.',
  },
  LIST_TABLES: {
    resourcePlaceholder: 'Optional',
    params: {},
    description: 'Lists all DynamoDB tables available in LocalStack.',
  },
  CREATE_TABLE: {
    resourcePlaceholder: 'person',
    params: { tableName: 'person', partitionKey: 'id' },
    description: 'Creates a table with string partition key.',
  },
  DELETE_TABLE: {
    resourcePlaceholder: 'person',
    params: { tableName: 'person' },
    description: 'Deletes a table by name.',
  },
  PUT_ITEM: {
    resourcePlaceholder: 'person',
    params: {
      tableName: 'person',
      item: { id: '000012356', name: 'John Doe', birthdate: '1979-01-01' },
    },
    description: 'Inserts or updates an item with JSON attributes.',
  },
  GET_ITEM: {
    resourcePlaceholder: 'person',
    params: { tableName: 'person', key: { id: '000012356' } },
    description: 'Fetches a DynamoDB item using its key object.',
  },
}

function prettyJson(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return '{}'
  }
}

function parseJson(value) {
  if (!value || !value.trim()) return {}
  return JSON.parse(value)
}

export default function AwsEmulator() {
  const [service, setService] = useState('LOCALSTACK')
  const [action, setAction] = useState('STATUS')
  const [resourceName, setResourceName] = useState('')
  const [params, setParams] = useState(prettyJson(ACTION_HINTS.STATUS.params))
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])

  const actionOptions = useMemo(() => ACTION_OPTIONS[service] || [], [service])
  const activeHint = ACTION_HINTS[action] || ACTION_HINTS.STATUS

  useEffect(() => {
    const defaults = ACTION_OPTIONS[service] || []
    if (!defaults.includes(action)) {
      const nextAction = defaults[0] || 'STATUS'
      setAction(nextAction)
      setParams(prettyJson(ACTION_HINTS[nextAction]?.params || {}))
      setResourceName('')
    }
  }, [service, action])

  useEffect(() => {
    setParams(prettyJson(activeHint.params || {}))
    setResourceName('')
    setError('')
  }, [action])

  useEffect(() => {
    const runInitialStatus = async () => {
      await executeOperation('LOCALSTACK', 'STATUS', '', {})
    }
    runInitialStatus()
  }, [])

  const executeOperation = async (serviceInput = service, actionInput = action, resourceInput = resourceName, paramsInput) => {
    setLoading(true)
    setError('')

    let parsedParams = {}
    try {
      parsedParams = paramsInput ?? parseJson(params)
    } catch {
      setError('Parameters must be valid JSON.')
      setLoading(false)
      return
    }

    try {
      const res = await api.post('/emulator/aws', {
        service: serviceInput,
        action: actionInput,
        resourceName: resourceInput?.trim() ? resourceInput.trim() : undefined,
        parameters: parsedParams,
      })

      setResponse(res.data)
      setHistory((prev) => [
        {
          service: serviceInput,
          action: actionInput,
          resourceName: resourceInput,
          message: res.data?.message,
          success: !!res.data?.success,
          time: new Date(),
        },
        ...prev.slice(0, 19),
      ])
    } catch (err) {
      const fallbackMessage = err.response?.data?.error || err.response?.data?.message || 'AWS emulator request failed.'
      setError(fallbackMessage)
      setResponse({ success: false, message: fallbackMessage, output: {} })
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = () => setParams(prettyJson(activeHint.params || {}))
  const handleStatus = () => executeOperation('LOCALSTACK', 'STATUS', '', {})
  const handleBootstrap = () => executeOperation('LOCALSTACK', 'BOOTSTRAP', '', {})
  const outputText = response ? prettyJson(response.output || {}) : ''

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">AWS Emulator</h1>
          <p className="text-muted text-sm mt-1">LocalStack-backed AWS operations for S3 and DynamoDB from one control panel.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleStatus}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-surface text-sm text-gray-300 hover:text-white hover:bg-border transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" /> Check Status
          </button>
          <button
            onClick={handleBootstrap}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-sm text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Wrench className="w-4 h-4" /> Bootstrap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SERVICE_OPTIONS.map((svc) => (
          <button
            key={svc.id}
            onClick={() => setService(svc.id)}
            className={`p-4 rounded-xl border transition-all text-left ${service === svc.id ? 'bg-primary/10 border-primary/50' : 'bg-dark border-border/30 hover:border-primary/30'}`}
          >
            <svc.icon className={`w-5 h-5 mb-2 ${service === svc.id ? 'text-primary' : 'text-muted'}`} />
            <p className={`text-sm font-semibold ${service === svc.id ? 'text-white' : 'text-gray-300'}`}>{svc.name}</p>
            <p className="text-xs text-muted mt-1">{svc.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-6 bg-dark border border-border/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Cloud className="w-4 h-4 text-primary" /> Operation Builder
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Service</label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
              >
                {SERVICE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary"
              >
                {actionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Resource Name</label>
            <input
              type="text"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder={activeHint.resourcePlaceholder || 'Optional'}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-400">Parameters (JSON)</label>
              <button onClick={applyTemplate} type="button" className="text-[11px] text-primary hover:text-primary-light transition-colors">
                Load Template
              </button>
            </div>
            <textarea
              value={params}
              onChange={(e) => setParams(e.target.value)}
              placeholder="{}"
              className="w-full min-h-40 px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono placeholder-muted focus:outline-none focus:border-primary"
            />
          </div>

          <div className="rounded-lg border border-border/30 bg-surface/20 p-3 text-xs text-muted">{activeHint.description}</div>

          {error && <div className="p-2 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs">{error}</div>}

          <button
            onClick={() => executeOperation()}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Play className="w-4 h-4" />}
            Execute Operation
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-border/20 bg-surface/20 p-3">
              <div className="text-[11px] text-muted mb-1">Active Service</div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> {service}
              </div>
            </div>
            <div className="rounded-lg border border-border/20 bg-surface/20 p-3">
              <div className="text-[11px] text-muted mb-1">Action</div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> {action}
              </div>
            </div>
            <div className="rounded-lg border border-border/20 bg-surface/20 p-3">
              <div className="text-[11px] text-muted mb-1">History Entries</div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-primary" /> {history.length}
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-6 space-y-4">
          <div className="bg-dark border border-border/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Latest Response
              </h3>
              {response && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${response.success ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                  {response.success ? 'Success' : 'Error'}
                </span>
              )}
            </div>

            {!response ? (
              <p className="text-xs text-muted">Run any operation to inspect output, errors, and returned payload details.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">{response.message || 'No message provided.'}</p>
                <div className="rounded-lg bg-surface/30 p-4 overflow-auto max-h-[420px]">
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{outputText}</pre>
                </div>
              </div>
            )}
          </div>

          <div className="bg-dark border border-border/30 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Operation History</h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted">No operations executed yet.</p>
            ) : (
              <div className="space-y-1 max-h-[280px] overflow-auto">
                {history.map((entry, index) => (
                  <div key={`${entry.service}-${entry.action}-${index}`} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface/30 transition-colors">
                    <div className={`w-2 h-2 rounded-full ${entry.success ? 'bg-success' : 'bg-danger'}`} />
                    <span className="text-xs font-medium text-primary w-20">{entry.service}</span>
                    <span className="text-xs text-gray-300 w-28">{entry.action}</span>
                    <span className="text-xs text-muted truncate flex-1">{entry.message || entry.resourceName || '-'}</span>
                    <span className="text-[10px] text-muted">{entry.time.toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
