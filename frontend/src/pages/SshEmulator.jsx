import { useState, useRef, useEffect, useMemo } from 'react'
import { Terminal, Wifi, WifiOff } from 'lucide-react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const QUICK_COMMANDS = ['pwd', 'whoami', 'ls -la', 'uname -a', 'clear']

export default function SshEmulator() {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [ptyType, setPtyType] = useState('xterm')
  const [profileName, setProfileName] = useState('')
  const [profiles, setProfiles] = useState([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [command, setCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [output, setOutput] = useState([])
  const [outputFilter, setOutputFilter] = useState('')
  const [showTimestamps, setShowTimestamps] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [reconnectEnabled, setReconnectEnabled] = useState(true)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [connectedSince, setConnectedSince] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [socket, setSocket] = useState(null)
  const outputRef = useRef(null)
  const inputRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const manualDisconnectRef = useRef(false)

  useEffect(() => {
    if (!user?.userId) {
      setProfiles([])
      return
    }

    api
      .get('/ssh/profiles', { params: { userId: user.userId } })
      .then((res) => {
        setProfiles(Array.isArray(res.data) ? res.data : [])
      })
      .catch(() => {
        setProfiles([])
        setStatusMessage('Unable to load profiles from backend')
      })
  }, [user?.userId])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (socket) {
        try {
          socket.close()
        } catch {
          // ignore
        }
      }
    }
  }, [socket])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const filteredOutput = useMemo(() => {
    if (!outputFilter.trim()) return output
    const needle = outputFilter.trim().toLowerCase()
    return output.filter((line) => String(line.text || '').toLowerCase().includes(needle))
  }, [output, outputFilter])

  const sessionDurationLabel = useMemo(() => {
    if (!connectedSince) return '0s'
    const seconds = Math.max(0, Math.floor((Date.now() - connectedSince) / 1000))
    if (seconds < 60) return `${seconds}s`
    const mins = Math.floor(seconds / 60)
    const rem = seconds % 60
    return `${mins}m ${rem}s`
  }, [connectedSince, output.length])

  const addOutput = (text, type = 'output') => {
    setOutput((prev) => [...prev, { text, type, time: new Date() }])
  }

  const getWsUrl = () => {
    if (import.meta.env.VITE_SSH_WS_URL) return import.meta.env.VITE_SSH_WS_URL
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${window.location.hostname}:8081/ws/ssh`
  }

  const handleConnect = async (isReconnect = false) => {
    if (connecting) return
    setConnecting(true)
    setStatusMessage(isReconnect ? 'Reconnecting…' : 'Connecting…')
    manualDisconnectRef.current = false

    try {
      const ws = new WebSocket(getWsUrl())
      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'connect', host, port: Number(port), username, password, ptyType }))
      }
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'connected') {
            setConnected(true)
            setConnectedSince(Date.now())
            setReconnectAttempts(0)
            setStatusMessage('Connected')
            setOutput([
              { text: `Connected to ${username}@${host}:${port}`, type: 'system' },
              { text: 'SSH session established', type: 'system' },
              { text: '', type: 'separator' },
            ])
            setTimeout(() => inputRef.current?.focus(), 100)
          }
          if (payload.type === 'output') addOutput(payload.data, 'output')
          if (payload.type === 'error') addOutput(payload.message, 'error')
          if (payload.type === 'info') addOutput(payload.message, 'system')
        } catch {
          addOutput(event.data, 'output')
        }
      }
      ws.onclose = () => {
        setConnected(false)
        setSocket(null)
        setConnectedSince(null)
        addOutput('Connection closed.', 'system')

        if (reconnectEnabled && !manualDisconnectRef.current && reconnectAttempts < 3) {
          const nextAttempt = reconnectAttempts + 1
          setReconnectAttempts(nextAttempt)
          setStatusMessage(`Reconnecting (${nextAttempt}/3)…`)
          reconnectTimeoutRef.current = setTimeout(() => handleConnect(true), 1200)
        }
      }
      ws.onerror = () => addOutput('WebSocket error', 'error')
      setSocket(ws)
    } catch (err) {
      addOutput(`Connection failed: ${err.message}`, 'error')
      setStatusMessage('Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!socket) return
    manualDisconnectRef.current = true
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    try {
      socket.send(JSON.stringify({ action: 'disconnect' }))
      socket.close()
    } catch {
      setConnected(false)
    }
  }

  const saveCurrentProfile = () => {
    const name = profileName.trim() || `${username || 'user'}@${host}:${port}`
    if (!user?.userId) {
      setStatusMessage('Login required to save profile')
      return
    }

    api
      .post('/ssh/profiles', {
        userId: user.userId,
        name,
        host,
        port: Number(port),
        username,
        ptyType,
      })
      .then((res) => {
        const saved = res.data
        setProfiles((prev) => {
          const idx = prev.findIndex((p) => p.id === saved.id)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = saved
            return updated
          }
          return [saved, ...prev].slice(0, 12)
        })
        setProfileName(saved.name)
        setSelectedProfile(String(saved.id))
        setStatusMessage(`Profile saved: ${saved.name}`)
      })
      .catch((err) => {
        setStatusMessage(err.response?.data?.message || 'Unable to save profile')
      })
  }

  const loadProfile = (profileId) => {
    const profile = profiles.find((item) => String(item.id) === String(profileId))
    if (!profile) return
    setHost(profile.host || 'localhost')
    setPort(String(profile.port || '22'))
    setUsername(profile.username || '')
    setPtyType(profile.ptyType || 'xterm')
    setProfileName(profile.name)
    setSelectedProfile(String(profile.id))
  }

  const deleteProfile = () => {
    if (!selectedProfile || !user?.userId) return

    api
      .delete(`/ssh/profiles/${selectedProfile}`, { params: { userId: user.userId } })
      .then(() => {
        setProfiles((prev) => prev.filter((profile) => String(profile.id) !== String(selectedProfile)))
        setSelectedProfile('')
        setStatusMessage('Profile removed')
      })
      .catch((err) => {
        setStatusMessage(err.response?.data?.message || 'Unable to delete profile')
      })
  }

  const sendTerminalCommand = (value) => {
    if (!value.trim() || !socket || !connected) return

    addOutput(`${username}@${host}$ ${value}`, 'command')
    if (value === 'clear') {
      setOutput([])
      return
    }
    socket.send(JSON.stringify({ action: 'input', data: `${value}\n` }))
  }

  const copyLogs = async () => {
    const text = output.map((line) => String(line.text || '')).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setStatusMessage('Logs copied to clipboard')
    } catch {
      setStatusMessage('Unable to copy logs')
    }
  }

  const exportLogs = () => {
    const text = output
      .map((line) => {
        if (!showTimestamps) return String(line.text || '')
        const stamp = line.time ? new Date(line.time).toLocaleTimeString() : ''
        return stamp ? `[${stamp}] ${String(line.text || '')}` : String(line.text || '')
      })
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `ssh-session-${Date.now()}.log`
    anchor.click()
    URL.revokeObjectURL(href)
  }

  const handleCommand = async (e) => {
    e.preventDefault()
    if (!command.trim() || !socket || !connected) return

    sendTerminalCommand(command)
    setCommandHistory((prev) => [command, ...prev.filter((entry) => entry !== command)].slice(0, 100))
    setHistoryIndex(-1)
    setCommand('')
  }

  const handleCommandKeyDown = (e) => {
    if (!commandHistory.length) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextIndex = Math.min(historyIndex + 1, commandHistory.length - 1)
      setHistoryIndex(nextIndex)
      setCommand(commandHistory[nextIndex] || '')
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = historyIndex - 1
      if (nextIndex < 0) {
        setHistoryIndex(-1)
        setCommand('')
        return
      }
      setHistoryIndex(nextIndex)
      setCommand(commandHistory[nextIndex] || '')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">SSH Emulator</h1>
        <p className="text-muted text-sm mt-1">Interactive SSH terminal bridge</p>
      </div>

      {!connected && (
        <div className="bg-dark border border-border/30 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" /> SSH Connection
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Host</label>
              <input type="text" value={host} onChange={(e) => setHost(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Port</label>
              <input type="text" value={port} onChange={(e) => setPort(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">PTY</label>
              <select value={ptyType} onChange={(e) => setPtyType(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm font-mono focus:outline-none focus:border-primary">
                <option value="xterm">xterm</option>
                <option value="xterm-256color">xterm-256color</option>
                <option value="vt100">vt100</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Saved Profile</label>
              <select value={selectedProfile} onChange={(e) => { setSelectedProfile(e.target.value); loadProfile(e.target.value) }} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-primary">
                <option value="">Select profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={String(profile.id)}>{profile.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Profile name"
              className="px-3 py-2 rounded-lg bg-surface border border-border text-white text-xs focus:outline-none focus:border-primary"
            />
            <button onClick={saveCurrentProfile} className="px-3 py-2 rounded-lg bg-surface border border-border text-xs text-white hover:border-primary/50">Save Profile</button>
            <button onClick={deleteProfile} disabled={!selectedProfile} className="px-3 py-2 rounded-lg bg-surface border border-border text-xs text-muted hover:text-white disabled:opacity-50">Delete Profile</button>
            <button
              onClick={handleConnect}
              disabled={connecting || !host.trim() || !username.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {connecting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Wifi className="w-4 h-4" />}
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={reconnectEnabled}
              onChange={(e) => setReconnectEnabled(e.target.checked)}
              className="accent-primary"
            />
            Auto-reconnect on unexpected disconnect (max 3 tries)
          </label>
        </div>
      )}

      <div className="bg-[#0d1117] border border-border/30 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-border/20">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-muted ml-2 font-mono">{connected ? `${username}@${host}` : 'ssh - disconnected'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted">{statusMessage || (connected ? 'Session active' : 'Idle')}</span>
            {connected && (
              <>
                <span className="flex items-center gap-1 text-[10px] text-green-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Connected
                </span>
                <button onClick={handleDisconnect} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-red-400 hover:bg-red-400/10 transition-colors">
                  <WifiOff className="w-3 h-3" /> Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-2 border-b border-border/20 bg-surface/10">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={outputFilter}
                onChange={(e) => setOutputFilter(e.target.value)}
                placeholder="Search logs"
                className="px-3 py-1.5 rounded bg-surface border border-border text-xs text-white focus:outline-none focus:border-primary"
              />
              <label className="inline-flex items-center gap-1 text-[11px] text-muted">
                <input type="checkbox" checked={showTimestamps} onChange={(e) => setShowTimestamps(e.target.checked)} className="accent-primary" />
                Timestamps
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] text-muted">Lines: {output.length}</span>
              <span className="text-[10px] text-muted">Session: {sessionDurationLabel}</span>
              <button onClick={copyLogs} className="px-2 py-1 rounded text-[10px] text-muted hover:text-white hover:bg-surface/30">Copy</button>
              <button onClick={exportLogs} className="px-2 py-1 rounded text-[10px] text-muted hover:text-white hover:bg-surface/30">Export</button>
            </div>
          </div>
        </div>

        <div ref={outputRef} className="p-4 font-mono text-sm min-h-[400px] max-h-[600px] overflow-y-auto">
          {filteredOutput.map((line, i) => (
            <div
              key={i}
              className={`${
                line.type === 'command'
                  ? 'text-green-400'
                  : line.type === 'error'
                    ? 'text-red-400'
                    : line.type === 'system'
                      ? 'text-cyan-400 italic'
                      : line.type === 'separator'
                        ? 'border-b border-border/10 my-2'
                        : 'text-gray-300'
              } whitespace-pre-wrap leading-relaxed text-xs`}
            >
              {showTimestamps && line.time && <span className="text-muted mr-2">[{new Date(line.time).toLocaleTimeString()}]</span>}
              {line.text}
            </div>
          ))}

          {connected && (
            <div className="flex flex-wrap gap-2 py-2">
              {QUICK_COMMANDS.map((quick) => (
                <button
                  key={quick}
                  onClick={() => sendTerminalCommand(quick)}
                  className="px-2 py-1 rounded border border-border/40 text-[10px] text-muted hover:text-white hover:border-primary/50"
                >
                  {quick}
                </button>
              ))}
            </div>
          )}

          {connected && (
            <form onSubmit={handleCommand} className="flex items-center gap-0 mt-1">
              <span className="text-green-400 text-xs">{username}@{host}</span>
              <span className="text-white text-xs mr-2">$</span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleCommandKeyDown}
                className="flex-1 bg-transparent text-white text-xs outline-none caret-green-400 font-mono"
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
