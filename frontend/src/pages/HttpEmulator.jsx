import { useState } from 'react'
import api from '../api'
import { Send, Plus, X } from 'lucide-react'

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

export default function HttpEmulator() {
  const [method, setMethod] = useState('GET')
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1')
  const [headers, setHeaders] = useState([{ key: '', value: '' }])
  const [body, setBody] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('body')

  const handleSend = async () => {
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
      setResponse({
        statusCode: res.data.status,
        body: res.data.body,
        headers: res.data.headers || {},
      })
      setHistory((prev) => [{ method, url, status: res.data.status, time: new Date() }, ...prev.slice(0, 19)])
    } catch (err) {
      setResponse({ statusCode: 0, error: err.response?.data?.error || err.message, headers: {} })
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">HTTP Emulator</h1>
        <p className="text-muted text-sm mt-1">Send HTTP requests to any endpoint</p>
      </div>

      <div className="bg-dark border border-border/30 rounded-xl p-4">
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
            placeholder="Enter URL..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-white text-sm placeholder-muted focus:outline-none focus:border-primary font-mono"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={loading || !url}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>

        <div className="flex gap-1 mt-4 border-b border-border/20">
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
          <div className="mt-4 space-y-2">
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
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
                <button onClick={() => removeHeader(i)} className="p-2 text-muted hover:text-danger transition-colors">
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
          <div className="mt-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder='{"key": "value"}'
              className="w-full px-4 py-3 rounded-lg bg-surface border border-border text-white text-sm placeholder-muted focus:outline-none focus:border-primary font-mono resize-none"
            />
          </div>
        )}
      </div>

      {response && (
        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
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
          </div>

          {response.error && <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm font-mono">{response.error}</div>}

          <div className="rounded-lg bg-surface/30 p-4 overflow-auto max-h-96">
            <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">{formatJson(response.body || '')}</pre>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-dark border border-border/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Request History</h3>
          <div className="space-y-1">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  setMethod(h.method)
                  setUrl(h.url)
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-surface/30 text-left transition-colors"
              >
                <span className={`text-xs font-medium w-14 ${METHOD_COLORS[h.method]}`}>{h.method}</span>
                <span className="text-xs text-gray-300 truncate flex-1 font-mono">{h.url}</span>
                <span className={`text-xs font-medium ${h.status >= 200 && h.status < 300 ? 'text-green-400' : 'text-red-400'}`}>{h.status}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
