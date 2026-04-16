import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { Shield, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
        navigate('/')
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        await api.post('/auth/request-access', {
          name,
          email,
          password,
          confirmPassword,
          reason: 'Access request from login page'
        })
        setRequested(true)
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access not granted yet or Access denied')
      } else {
        setError(err.response?.data?.message || 'Invalid credentials')
      }
    } finally {
      setLoading(false)
    }
  }

  if (requested) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center p-4">
        <div className="bg-dark border border-border/50 rounded-2xl p-8 shadow-2xl text-center max-w-sm">
          <div className="flex justify-center mb-6">
            <div className="success-check relative">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access requested successfully</h2>
          <p className="text-muted text-sm mb-6">You will be able to login once an admin approves your request.</p>
          <button onClick={() => { setRequested(false); setIsLogin(true) }} className="text-primary hover:text-primary-light transition-colors">
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-darker flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">RMACS</h1>
          <p className="text-muted text-sm mt-1">Resource Management & Access Control</p>
        </div>

        <div className="bg-dark border border-border/50 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">
            {isLogin ? 'Sign in to your account' : 'Request Access'}
          </h2>
          
          {error && <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="Enter name" required />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" placeholder="Enter email" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">{isLogin ? 'Password' : 'Create Password'}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors pr-10" placeholder={isLogin ? 'Enter password' : 'Create password'} required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
               <div>
                 <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
                 <div className="relative">
                   <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors pr-10" placeholder="Confirm password" required />
                 </div>
               </div>
            )}

            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white font-medium hover:from-primary-light hover:to-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Request')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 text-center">
            <button type="button" onClick={() => {setIsLogin(!isLogin); setError('')}} className="text-sm text-primary hover:text-primary-light transition-colors">
              {isLogin ? "Need an account? Request access" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}