import { useMemo, useState } from 'react'
import api from '../api'
import { Send, Plus, X, Upload, FileJson, BookOpen, Play, Clock3 } from 'lucide-react'

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']
const METHOD_COLORS = {
  GET: 'text-green-400',
  POST: 'text-yellow-400',
  PUT: 'text-blue-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
  HEAD: 'text-gray-400',
  OPTIONS: 'text-cyan-400',
}

const DOC_BADGE_COLORS = {
  GET: 'bg-green-500/10 text-green-400 border-green-500/20',
  POST: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PUT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  HEAD: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
  OPTIONS: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

function stringifyBody(value) {
  if (typeof value === 'string') return value
  if (value == null) return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function HttpEmulator() {
  const [workspaceTab, setWorkspaceTab] = useState('request')
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1')
  const [headers, setHeaders] = useState([{ key: '', value: '' }])
  const [body, setBody] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('body')
  const [responseTab, setResponseTab] = useState('body')
  const [collectionMeta, setCollectionMeta] = useState(null)
  const [collectionRequests, setCollectionRequests] = useState([])
  const [collectionStats, setCollectionStats] = useState({ total: 0, methods: {}, folders: 0 })
  const [selectedCollectionRequestId, setSelectedCollectionRequestId] = useState('')
  const [collectionError, setCollectionError] = useState('')
  const [collectionRunResult, setCollectionRunResult] = useState(null)
  const [collectionRunLoading, setCollectionRunLoading] = useState(false)

  const selectedCollectionRequest = useMemo(
    () => collectionRequests.find((request) => request.id === selectedCollectionRequestId) || null,
    [collectionRequests, selectedCollectionRequestId],
  )

  const handleSend = async () => {
    if (!url.trim()) return

    const startedAt = Date.now()
    setLoading(true)
    setResponse(null)

    const headerMap = {}
    headers.forEach((h) => {
      if (h.key) headerMap[h.key] = h.value
    })

    try {
      const res = await api.post('/emulator/http', {
        url,
        method,
        headers: Object.keys(headerMap).length ? headerMap : null,
        body: body || null,
      })

      const responseBody = typeof res.data.body === 'string' ? res.data.body : stringifyBody(res.data.body)

      setResponse({
        statusCode: res.data.status,
        body: responseBody,
        headers: res.data.headers || {},
        durationMs: Date.now() - startedAt,
        sizeBytes: responseBody.length,
      })
      setHistory((prev) => [{ method, url, status: res.data.status, time: new Date(), durationMs: Date.now() - startedAt }, ...prev.slice(0, 24)])
    } catch (err) {
      setResponse({
        statusCode: 0,
        error: err.response?.data?.error || err.message,
        headers: {},
        durationMs: Date.now() - startedAt,
        sizeBytes: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }])
  const removeHeader = (i) => setHeaders(headers.filter((_, idx) => idx !== i))
  const updateHeader = (i, field, val) => {
    const h = [...headers]
    h[i][field] = val
    setHeaders(h)
  }

  const formatJson = (str) => {
    try {
      return JSON.stringify(JSON.parse(str), null, 2)
    } catch {
      return str
    }
  }

  const handleCollectionUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCollectionError('')
    setCollectionRunResult(null)

    try {
      const rawContent = await file.text()
      const importResponse = await api.post('/emulator/collections/import', {
        rawJson: rawContent,
      })

      const requests = Array.isArray(importResponse.data?.requests) ? importResponse.data.requests : []
      if (!requests.length) throw new Error('Collection imported, but no request endpoints were found.')

      setCollectionMeta(importResponse.data?.meta || { name: file.name, schema: 'Unknown schema', description: '' })
      setCollectionStats(
        importResponse.data?.stats || {
          total: requests.length,
          methods: {},
          folders: new Set(requests.map((request) => request.folder).filter(Boolean)).size,
        },
      )
      setCollectionRequests(requests)
      setSelectedCollectionRequestId(requests[0].id)

      setMethod(requests[0].method)
      setUrl(requests[0].url)
      setHeaders(requests[0].headers.length ? requests[0].headers : [{ key: '', value: '' }])
      setBody(requests[0].body || '')
    } catch (uploadErr) {
      setCollectionMeta(null)
      setCollectionRequests([])
      setCollectionStats({ total: 0, methods: {}, folders: 0 })
      setSelectedCollectionRequestId('')
      setCollectionError(uploadErr.response?.data?.error || uploadErr.message || 'Failed to parse uploaded collection file.')
    }

    event.target.value = ''
  }

  const handleRunCollection = async () => {
    if (!collectionRequests.length) return

    setCollectionRunLoading(true)
    setCollectionError('')

    try {
      const runResponse = await api.post('/emulator/collections/run', {
        requests: collectionRequests,
        stopOnError: false,
      })
      setCollectionRunResult(runResponse.data || null)
    } catch (runErr) {
      setCollectionRunResult(null)
      setCollectionError(runErr.response?.data?.error || runErr.message || 'Failed to run collection.')
    } finally {
      setCollectionRunLoading(false)
    }
  }

  const applyRequestFromCollection = (requestId) => {
    const request = collectionRequests.find((entry) => entry.id === requestId)
    if (!request) return

    setSelectedCollectionRequestId(request.id)
    setMethod(request.method)
    setUrl(request.url)
    setHeaders(request.headers?.length ? request.headers : [{ key: '', value: '' }])
    setBody(request.body || '')
    setWorkspaceTab('request')
  }

  const formatHeaderValue = (value) => {
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">HTTP Emulator</h1>
          <p className="text-muted text-sm mt-1">Postman-style API testing with collection upload and web documentation output.</p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          Upload Collection
          <input type="file" accept="application/json,.json" onChange={handleCollectionUpload} className="hidden" />
        </label>
      </div>

      {collectionError && <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{collectionError}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <aside className="xl:col-span-3 bg-dark border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <FileJson className="w-4 h-4 text-primary" />
              Collections
            </div>
            {collectionRequests.length > 0 && <span className="text-[11px] text-muted">{collectionStats.total} endpoints</span>}
          </div>

          {!collectionMeta ? (
            <div className="p-4 text-xs text-muted">Upload a Postman collection JSON to populate endpoints and generate clean web documentation.</div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="rounded-lg border border-border/20 bg-surface/20 p-3">
                <div className="text-sm font-semibold text-white truncate">{collectionMeta.name}</div>
                <div className="text-[11px] text-muted mt-1">{collectionStats.folders} folders • {collectionStats.total} requests</div>
              </div>

              <div className="space-y-1 max-h-[520px] overflow-auto pr-1">
                {collectionRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => applyRequestFromCollection(request.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      selectedCollectionRequestId === request.id
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-transparent hover:border-border/30 hover:bg-surface/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold w-14 ${METHOD_COLORS[request.method] || 'text-white'}`}>{request.method}</span>
                      <span className="text-xs text-gray-200 truncate">{request.name}</span>
                    </div>
                    <div className="text-[11px] text-muted mt-1 truncate font-mono">{request.url}</div>
                    {request.folder && <div className="text-[10px] text-muted/80 mt-1 truncate">{request.folder}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="xl:col-span-9 space-y-4">
          <div className="bg-dark border border-border/30 rounded-xl overflow-hidden">
            <div className="px-4 pt-3 border-b border-border/20">
              <div className="flex gap-1">
                {[
                  { key: 'request', label: 'Request Builder', icon: Play },
                  { key: 'docs', label: 'Collection Docs', icon: BookOpen },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setWorkspaceTab(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                      workspaceTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-white'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {workspaceTab === 'request' && (
              <div className="p-4 space-y-4">
                <div className="flex gap-2">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={`px-3 py-2.5 rounded-lg bg-surface border border-border text-sm font-medium focus:outline-none focus:border-primary min-w-[100px] ${METHOD_COLORS[method] || 'text-white'}`}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/items"
                    className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-white text-sm placeholder-muted focus:outline-none focus:border-primary font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button
                    onClick={handleSend}
                    disabled={loading || !url.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                  >
                    {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="w-4 h-4" />}
                    Send
                  </button>
                </div>

                <div className="flex gap-1 border-b border-border/20">
                  {['headers', 'body'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${
                        activeTab === tab ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'headers' && (
                  <div className="space-y-2">
                    {headers.map((h, i) => (
                      <div key={`${h.key}-${i}`} className="flex gap-2">
                        <input
                          type="text"
                          value={h.key}
                          onChange={(e) => updateHeader(i, 'key', e.target.value)}
                          placeholder="Header name"
                          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm placeholder-muted focus:outline-none focus:border-primary font-mono"
                        />
                        <input
                          type="text"
                          value={h.value}
                          onChange={(e) => updateHeader(i, 'value', e.target.value)}
                          placeholder="Value"
                          className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm placeholder-muted focus:outline-none focus:border-primary font-mono"
                        />
                        <button onClick={() => removeHeader(i)} className="p-2 text-muted hover:text-danger transition-colors" aria-label="Remove header">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button onClick={addHeader} className="flex items-center gap-1 text-xs text-primary hover:text-primary-light transition-colors">
                      <Plus className="w-3 h-3" /> Add Header
                    </button>
                  </div>
                )}

                {activeTab === 'body' && (
                  <div>
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      placeholder='{"name": "new item"}'
                      className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-white text-sm placeholder-muted focus:outline-none focus:border-primary font-mono resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {workspaceTab === 'docs' && (
              <div className="p-4 space-y-4">
                {!collectionMeta ? (
                  <div className="rounded-lg border border-border/30 bg-surface/20 p-4 text-sm text-muted">
                    Upload a Postman collection to automatically generate clean web-based API documentation.
                  </div>
                ) : (
                  <>
                    <div className="rounded-lg border border-border/30 bg-surface/20 p-4">
                      <div className="flex flex-wrap items-center gap-2 justify-between">
                        <h3 className="text-lg font-semibold text-white">{collectionMeta.name}</h3>
                        <button
                          onClick={handleRunCollection}
                          disabled={collectionRunLoading || collectionRequests.length === 0}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                          {collectionRunLoading ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : <Play className="w-3.5 h-3.5" />}
                          Run Collection
                        </button>
                      </div>
                      <p className="text-xs text-muted mt-1">Schema: {collectionMeta.schema}</p>
                      {collectionMeta.description && <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{String(collectionMeta.description)}</p>}
                    </div>

                    {collectionRunResult && (
                      <div className="rounded-lg border border-border/30 bg-surface/20 p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h4 className="text-sm font-semibold text-white">Collection Run Summary</h4>
                          <span className="text-xs text-muted">{collectionRunResult.total} total</span>
                          <span className="text-xs text-green-400">{collectionRunResult.succeeded} succeeded</span>
                          <span className="text-xs text-red-400">{collectionRunResult.failed} failed</span>
                          <span className="text-xs text-muted">{collectionRunResult.totalDurationMs} ms</span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-auto pr-1">
                          {(collectionRunResult.results || []).map((item, index) => (
                            <div key={`${item.id || item.url}-${index}`} className="rounded-lg border border-border/20 bg-dark/60 px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`font-semibold ${METHOD_COLORS[item.method] || 'text-white'}`}>{item.method}</span>
                                <span className="text-gray-200 truncate">{item.name}</span>
                                <span className="text-muted ml-auto">{item.durationMs} ms</span>
                                <span className={`${item.statusCode >= 200 && item.statusCode < 400 ? 'text-green-400' : 'text-red-400'}`}>
                                  {item.statusCode || 'Error'}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted font-mono truncate mt-1">{item.url}</div>
                              {item.error && <div className="text-[11px] text-danger mt-1">{item.error}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-border/30 bg-surface/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Endpoints</p>
                        <p className="text-xl font-semibold text-white mt-1">{collectionStats.total}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-surface/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Folders</p>
                        <p className="text-xl font-semibold text-white mt-1">{collectionStats.folders}</p>
                      </div>
                      <div className="rounded-lg border border-border/30 bg-surface/20 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-muted">Methods</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(collectionStats.methods).map(([methodName, count]) => (
                            <span key={methodName} className={`px-2 py-0.5 rounded border text-[11px] font-medium ${DOC_BADGE_COLORS[methodName] || 'bg-surface text-white border-border'}`}>
                              {methodName} {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {collectionRequests.map((request) => (
                        <article key={`docs-${request.id}`} className="rounded-xl border border-border/30 bg-dark/80 p-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${DOC_BADGE_COLORS[request.method] || 'bg-surface text-white border-border'}`}>
                              {request.method}
                            </span>
                            <h4 className="text-sm font-semibold text-white">{request.name}</h4>
                            <button
                              onClick={() => applyRequestFromCollection(request.id)}
                              className="ml-auto text-[11px] text-primary hover:text-primary-light"
                            >
                              Load into tester
                            </button>
                          </div>

                          <p className="text-xs font-mono text-gray-300 break-all">{request.url}</p>

                          {request.description && <p className="text-xs text-muted mt-2 whitespace-pre-wrap">{String(request.description)}</p>}

                          {request.queryParams.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted mb-2">Query Parameters</p>
                              <div className="grid gap-2">
                                {request.queryParams.map((param) => (
                                  <div key={`${request.id}-${param.key}`} className="rounded-lg border border-border/20 bg-surface/20 px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-white font-medium">{param.key}</span>
                                      {param.disabled && <span className="text-[10px] text-warning">disabled</span>}
                                    </div>
                                    {param.value && <p className="text-[11px] text-gray-300 mt-1 font-mono">Default: {param.value}</p>}
                                    {param.description && <p className="text-[11px] text-muted mt-1">{String(param.description)}</p>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {request.headers.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted mb-2">Required Headers</p>
                              <div className="rounded-lg border border-border/20 overflow-hidden">
                                {request.headers.map((header, index) => (
                                  <div key={`${request.id}-${header.key}-${index}`} className="grid grid-cols-[160px,1fr] gap-3 px-3 py-2 text-xs border-b border-border/10 last:border-b-0">
                                    <span className="text-gray-100 font-medium break-all">{header.key}</span>
                                    <span className="text-gray-300 font-mono break-all">{header.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {request.responses.length > 0 && (
                            <div className="mt-3">
                              <p className="text-[11px] uppercase tracking-wide text-muted mb-2">Expected Responses</p>
                              <div className="space-y-2">
                                {request.responses.map((responseExample, idx) => (
                                  <div key={`${request.id}-response-${idx}`} className="rounded-lg border border-border/20 bg-surface/20 p-3">
                                    <div className="flex items-center gap-2 text-xs mb-2">
                                      <span className="text-white font-medium">{responseExample.name}</span>
                                      {responseExample.code && (
                                        <span className={`px-2 py-0.5 rounded ${
                                          responseExample.code >= 200 && responseExample.code < 300
                                            ? 'bg-green-500/15 text-green-400'
                                            : responseExample.code >= 400
                                              ? 'bg-red-500/15 text-red-400'
                                              : 'bg-amber-500/15 text-amber-400'
                                        }`}
                                        >
                                          {responseExample.code}
                                        </span>
                                      )}
                                    </div>
                                    {responseExample.body && (
                                      <pre className="text-[11px] text-gray-300 font-mono bg-darker/60 border border-border/20 rounded p-3 overflow-auto max-h-60 whitespace-pre-wrap">
                                        {formatJson(responseExample.body)}
                                      </pre>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {response && (
            <div className="bg-dark border border-border/30 rounded-xl p-4">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="text-sm font-semibold text-white">Response</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    response.statusCode >= 200 && response.statusCode < 300
                      ? 'bg-green-500/15 text-green-400'
                      : response.statusCode >= 400
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {response.statusCode || 'Error'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                  <Clock3 className="w-3 h-3" />
                  {response.durationMs} ms
                </span>
                <span className="text-[11px] text-muted">{response.sizeBytes} bytes</span>
              </div>

              <div className="flex gap-1 border-b border-border/20 mb-3">
                {['body', 'headers'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setResponseTab(tab)}
                    className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${
                      responseTab === tab ? 'text-primary border-primary' : 'text-muted border-transparent hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {response.error && <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm font-mono">{response.error}</div>}

              {responseTab === 'body' && (
                <div className="rounded-lg bg-surface/30 p-4 overflow-auto max-h-[450px]">
                  <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{formatJson(response.body || '')}</pre>
                </div>
              )}

              {responseTab === 'headers' && (
                <div className="rounded-lg bg-surface/30 border border-border/20 overflow-hidden">
                  {Object.keys(response.headers || {}).length === 0 ? (
                    <div className="p-4 text-xs text-muted">No headers returned.</div>
                  ) : (
                    Object.entries(response.headers || {}).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[200px,1fr] gap-3 px-4 py-2 text-xs border-b border-border/10 last:border-b-0">
                        <span className="text-gray-100 font-medium break-all">{key}</span>
                        <span className="text-gray-300 font-mono break-all">{formatHeaderValue(value)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {history.length > 0 && (
            <div className="bg-dark border border-border/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Request History</h3>
              <div className="space-y-1 max-h-56 overflow-auto">
                {history.map((h, i) => (
                  <button
                    key={`${h.url}-${h.time?.toString?.() || i}`}
                    onClick={() => {
                      setMethod(h.method)
                      setUrl(h.url)
                      setWorkspaceTab('request')
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-surface/30 text-left transition-colors"
                  >
                    <span className={`text-xs font-medium w-14 ${METHOD_COLORS[h.method] || 'text-white'}`}>{h.method}</span>
                    <span className="text-xs text-gray-300 truncate flex-1 font-mono">{h.url}</span>
                    <span className="text-[11px] text-muted">{h.durationMs} ms</span>
                    <span className={`text-xs font-medium ${h.status >= 200 && h.status < 300 ? 'text-green-400' : 'text-red-400'}`}>{h.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedCollectionRequest && (
        <div className="rounded-lg border border-border/20 bg-surface/20 px-4 py-3 text-xs text-muted">
          Selected from collection: <span className="text-white font-medium">{selectedCollectionRequest.name}</span>
          <span className="mx-2">•</span>
          <span className={METHOD_COLORS[selectedCollectionRequest.method] || 'text-white'}>{selectedCollectionRequest.method}</span>
        </div>
      )}
    </div>
  )
}
