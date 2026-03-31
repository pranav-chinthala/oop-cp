import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

function normalizeUser(payload) {
  if (!payload) return null
  const role = payload.role
  const id = payload.userId ?? payload.id
  return {
    ...payload,
    id,
    userId: id,
    isSuperAdmin: role === 'SUPER_ADMIN',
    isProjectManager: role === 'PROJECT_MANAGER',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? normalizeUser(JSON.parse(saved)) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (!saved) {
      setLoading(false)
      return
    }

    const parsed = normalizeUser(JSON.parse(saved))
    if (!parsed?.userId) {
      localStorage.removeItem('user')
      setUser(null)
      setLoading(false)
      return
    }

    api
      .get(`/auth/me/${parsed.userId}`)
      .then((res) => {
        const merged = normalizeUser({ ...parsed, ...res.data })
        setUser(merged)
        localStorage.setItem('user', JSON.stringify(merged))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const normalized = normalizeUser(res.data)
    localStorage.setItem('token', `session-${normalized.userId}`)
    localStorage.setItem('user', JSON.stringify(normalized))
    setUser(normalized)
    return normalized
  }

  const logout = async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
