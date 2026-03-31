import { useState, useRef, useEffect } from 'react'
import { Terminal, Wifi, WifiOff } from 'lucide-react'

export default function SshEmulator() {
  const [connected, setConnected] = useState(false)
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [socket, setSocket] = useState(null)
  const outputRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output])

  const addOutput = (text, type = 'output') => {
    setOutput((prev) => [...prev, { text, type, time: new Date() }])
  }

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const ws = new WebSocket('ws://localhost:8080/ws/ssh')
      ws.onopen = () => {
        ws.send(JSON.stringify({ action: 'connect', host, port: Number(port), username, password, ptyType: 'xterm' }))
      }
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'connected') {
            setConnected(true)
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
        addOutput('Connection closed.', 'system')
      }
      ws.onerror = () => addOutput('WebSocket error', 'error')
      setSocket(ws)
    } catch (err) {
      addOutput(`Connection failed: ${err.message}`, 'error')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!socket) return
    try {
      socket.send(JSON.stringify({ action: 'disconnect' }))
      socket.close()
    } catch {
      setConnected(false)
    }
  }

  const handleCommand = async (e) => {
    e.preventDefault()
    if (!command.trim() || !socket || !connected) return

    addOutput(`${username}@${host}$ ${command}`, 'command')
    if (command === 'clear') {
      setOutput([])
      setCommand('')
      return
    }

    socket.send(JSON.stringify({ action: 'input', data: `${command}\n` }))
    setCommand('')
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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
          </div>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {connecting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Wifi className="w-4 h-4" />}
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
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

        <div ref={outputRef} className="p-4 font-mono text-sm min-h-[400px] max-h-[600px] overflow-y-auto">
          {output.map((line, i) => (
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
              {line.text}
            </div>
          ))}

          {connected && (
            <form onSubmit={handleCommand} className="flex items-center gap-0 mt-1">
              <span className="text-green-400 text-xs">{username}@{host}</span>
              <span className="text-white text-xs mr-2">$</span>
              <input
                ref={inputRef}
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
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
