import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { Search, Trash2, Check, X } from 'lucide-react'

export default function Users() {
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [pending, setPending] = useState([])
  const [showAllPending, setShowAllPending] = useState(false)

  const [superAdmins, setSuperAdmins] = useState([])
  const [employees, setEmployees] = useState([])

  const [pmBuckets, setPmBuckets] = useState({ active: [], past: [], removed: [] })
  const [pmTab, setPmTab] = useState('ACTIVE')

  const isSuperAdmin = !!currentUser?.isSuperAdmin

  const load = async () => {
    setLoading(true)
    try {
      if (isSuperAdmin) {
        const [pendingRes, saRes, empRes, pmBucketsRes] = await Promise.all([
          api.get('/requests/pending'),
          api.get('/users?role=SUPER_ADMIN'),
          api.get('/users?role=EMPLOYEE'),
          api.get('/users/project-managers/buckets'),
        ])

        setPending(pendingRes.data || [])
        setSuperAdmins(saRes.data || [])
        setEmployees(empRes.data || [])
        setPmBuckets(pmBucketsRes.data || { active: [], past: [], removed: [] })
      } else {
        const [projectListRes, usersRes] = await Promise.all([api.get(`/projects?userId=${currentUser.userId}`), api.get('/users')])

        const usersById = new Map((usersRes.data || []).map((user) => [user.id, user]))
        const projects = projectListRes.data || []

        const memberRows = []
        await Promise.all(
          projects.map(async (project) => {
            try {
              const detail = await api.get(`/projects/${project.id}`)
              for (const member of detail.data?.members || []) {
                const dbUser = usersById.get(member.userId)
                if (dbUser) {
                  memberRows.push({ ...dbUser, projectName: project.name })
                }
              }
            } catch {
            }
          }),
        )

        const deduped = Array.from(new Map(memberRows.map((row) => [row.id, row])).values())
        setSuperAdmins(deduped.filter((user) => user.role === 'SUPER_ADMIN'))
        setEmployees(deduped.filter((user) => user.role === 'EMPLOYEE'))
        setPmBuckets({
          active: deduped.filter((user) => user.role === 'PROJECT_MANAGER'),
          past: [],
          removed: [],
        })
        setPending([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [isSuperAdmin])

  const term = search.trim().toLowerCase()
  const matches = (row) => !term || row.name?.toLowerCase().includes(term) || row.email?.toLowerCase().includes(term)

  const filteredSuperAdmins = useMemo(() => superAdmins.filter(matches), [superAdmins, term])
  const filteredEmployees = useMemo(() => employees.filter(matches), [employees, term])
  const filteredPmBuckets = useMemo(
    () => ({
      active: (pmBuckets.active || []).filter(matches),
      past: (pmBuckets.past || []).filter(matches),
      removed: (pmBuckets.removed || []).filter(matches),
    }),
    [pmBuckets, term],
  )

  const activePmList = pmTab === 'ACTIVE' ? filteredPmBuckets.active : pmTab === 'PAST' ? filteredPmBuckets.past : filteredPmBuckets.removed

  const reviewRequest = async (requestId, approved) => {
    await api.post(`/requests/${requestId}/review`, {
      reviewerId: currentUser.userId,
      approved,
      grantRole: 'EMPLOYEE',
      rejectionReason: approved ? null : 'Access denied by super admin',
    })
    load()
  }

  const removeUser = async (userId) => {
    if (!confirm('Are you sure you want to remove this user?')) return
    await api.delete(`/users/${userId}?actorId=${currentUser.userId}`)
    load()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-muted text-sm mt-1">Profiles and user management</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-dark border border-border/50 text-white placeholder-muted focus:outline-none focus:border-primary text-sm"
        />
      </div>

      {isSuperAdmin && (
        <div className="bg-dark border border-border/30 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Pending Access Requests</h2>
            <span className="text-xs text-muted">{pending.length} requests</span>
          </div>
          {(showAllPending ? pending : pending.slice(0, 5)).map((request) => (
            <div key={request.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface/25 border border-border/20">
              <div>
                <p className="text-sm text-gray-200">{request.name}</p>
                <p className="text-xs text-muted">{request.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => reviewRequest(request.id, true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/20 text-green-400 text-xs hover:bg-success/30"
                >
                  <Check className="w-3.5 h-3.5" /> Grant
                </button>
                <button
                  onClick={() => reviewRequest(request.id, false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-danger/20 text-red-400 text-xs hover:bg-danger/30"
                >
                  <X className="w-3.5 h-3.5" /> Deny
                </button>
              </div>
            </div>
          ))}
          {pending.length > 5 && (
            <button onClick={() => setShowAllPending((state) => !state)} className="text-xs text-primary hover:text-primary-light">
              {showAllPending ? 'Show Less' : 'Show All'}
            </button>
          )}
          {pending.length === 0 && <p className="text-sm text-muted">No pending requests</p>}
        </div>
      )}

      <RoleSection title="Super Admins" rows={filteredSuperAdmins} sinceLabel="Super Admin since" onOpen={navigate} onRemove={isSuperAdmin ? removeUser : null} currentUserId={currentUser?.userId} />

      <div className="bg-dark border border-border/30 rounded-xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Project Managers</h2>
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <PmTabButton active={pmTab === 'ACTIVE'} label="Active PMs" onClick={() => setPmTab('ACTIVE')} />
              <PmTabButton active={pmTab === 'PAST'} label="Past PMs" onClick={() => setPmTab('PAST')} />
              <PmTabButton active={pmTab === 'REMOVED'} label="Removed PMs" onClick={() => setPmTab('REMOVED')} />
            </div>
          )}
        </div>
        <RoleRows
          rows={activePmList}
          sinceLabel={pmTab === 'ACTIVE' ? 'PM since' : pmTab === 'PAST' ? 'Role changed at' : 'Removed at'}
          onOpen={navigate}
          onRemove={isSuperAdmin && pmTab === 'ACTIVE' ? removeUser : null}
          currentUserId={currentUser?.userId}
          dateField={pmTab === 'ACTIVE' ? 'addedAt' : 'changedAt'}
        />
      </div>

      <RoleSection title="Employees" rows={filteredEmployees} sinceLabel="Employee since" onOpen={navigate} onRemove={isSuperAdmin ? removeUser : null} currentUserId={currentUser?.userId} />
    </div>
  )
}

function PmTabButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${active ? 'bg-primary/20 border-primary/40 text-primary-light' : 'bg-surface/20 border-border/40 text-muted hover:text-white'}`}
    >
      {label}
    </button>
  )
}

function RoleSection({ title, rows, sinceLabel, onOpen, onRemove, currentUserId }) {
  return (
    <div className="bg-dark border border-border/30 rounded-xl p-5 space-y-3">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <RoleRows rows={rows} sinceLabel={sinceLabel} onOpen={onOpen} onRemove={onRemove} currentUserId={currentUserId} dateField="addedAt" />
    </div>
  )
}

function RoleRows({ rows, sinceLabel, onOpen, onRemove, currentUserId, dateField }) {
  if (!rows.length) return <p className="text-sm text-muted">No records</p>

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <button
          type="button"
          key={row.id}
          onClick={() => onOpen(`/users/${row.id}`)}
          className="w-full text-left p-3 rounded-lg bg-surface/20 border border-border/20 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-200">{row.name}</p>
              <p className="text-xs text-muted">{sinceLabel} {row[dateField] ? new Date(row[dateField]).toLocaleString() : 'N/A'}</p>
            </div>
            {onRemove && row.id !== currentUserId && (
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(row.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    onRemove(row.id)
                  }
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted hover:text-danger hover:bg-danger/10"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}
