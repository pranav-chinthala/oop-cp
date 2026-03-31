import { useState, useEffect } from 'react'
import api from '../api'
import { Search, CheckCircle, Clock } from 'lucide-react'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(50)

  const fetchLogs = () => {
    setLoading(true)
    api
      .get('/audit')
      .then((res) => setLogs((res.data || []).slice(0, limit)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
  }, [limit])

  const filteredLogs = logs.filter(
    (log) =>
      !search ||
      log.actorName?.toLowerCase().includes(search.toLowerCase()) ||
      log.actionType?.toLowerCase().includes(search.toLowerCase()) ||
      log.details?.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType?.toLowerCase().includes(search.toLowerCase()),
  )

  const actionColors = {
    CREATE: 'text-green-400',
    DELETE: 'text-red-400',
    UPDATE: 'text-blue-400',
    LOGIN: 'text-cyan-400',
    LOGOUT: 'text-gray-400',
    PROVISION: 'text-emerald-400',
    DECOMMISSION: 'text-orange-400',
    GRANT: 'text-purple-400',
    REVOKE: 'text-amber-400',
  }

  const getActionColor = (action) => {
    for (const [key, color] of Object.entries(actionColors)) {
      if (action?.toUpperCase().includes(key)) return color
    }
    return 'text-gray-400'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-muted text-sm mt-1">System activity trail — {filteredLogs.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(+e.target.value)}
            className="px-3 py-2 rounded-lg bg-dark border border-border/50 text-gray-300 text-sm focus:outline-none focus:border-primary"
          >
            <option value={25}>Last 25</option>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={500}>Last 500</option>
          </select>
          <button onClick={fetchLogs} className="px-3 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark transition-colors">
            Refresh
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter logs by user, action, or details..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark border border-border/50 text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
        />
      </div>

      <div className="bg-dark border border-border/30 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider w-10">OK</th>
                <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">Time</th>
                <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">User</th>
                <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider">Action</th>
                <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider hidden md:table-cell">Target</th>
                <th className="text-left p-4 text-xs font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/10 hover:bg-surface/20 transition-colors">
                  <td className="p-4">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-gray-300">{log.actorName || 'System'}</span>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-medium ${getActionColor(log.actionType)}`}>{log.actionType}</span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    {log.entityType && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface text-gray-400">
                        {log.entityType} {log.entityId && `#${String(log.entityId).substring(0, 8)}`}
                      </span>
                    )}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <span className="text-xs text-muted max-w-xs truncate block">{log.details}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-8 text-center text-muted">Loading...</div>}
        {!loading && filteredLogs.length === 0 && <div className="p-8 text-center text-muted">No audit log entries found</div>}
      </div>
    </div>
  )
}
