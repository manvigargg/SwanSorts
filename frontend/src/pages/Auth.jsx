import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { signIn, signUp } from '../lib/supabase'

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(13,31,15,0.7)',
  border: '1px solid rgba(168,224,99,0.18)',
  borderRadius: 10, color: 'var(--cream)',
  fontSize: 14, fontFamily: 'var(--body)',
  transition: 'border-color 0.2s',
}

export default function Auth() {
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({ name:'', email:'', password:'', phone:'', city:'' })
  const nav = useNavigate()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      if (mode === 'login') {
        await signIn({ email: form.email, password: form.password })
      } else {
        await signUp({ email: form.email, password: form.password, name: form.name, phone: form.phone, city: form.city })
      }
      nav('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--ink)', padding: '24px',
      backgroundImage: 'radial-gradient(ellipse at 30% 40%, rgba(26,51,32,0.45) 0%, transparent 60%)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%', maxWidth: 420 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🦢</div>
          <h1 style={{ fontFamily: 'var(--head)', fontSize: 28, fontWeight: 800, color: 'var(--lime)', letterSpacing: '-0.5px' }}>
            SwanSorts
          </h1>
          <p style={{ fontSize: 13, color: 'var(--mist)', marginTop: 4 }}>AI Waste Intelligence</p>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', background: 'rgba(13,31,15,0.8)',
          border: '1px solid var(--border)', borderRadius: 12,
          padding: 4, marginBottom: 24,
        }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError('') }} style={{
              flex: 1, padding: '10px', borderRadius: 9, border: 'none',
              background: mode === m ? 'rgba(168,224,99,0.15)' : 'transparent',
              color: mode === m ? 'var(--lime)' : 'var(--mist)',
              fontFamily: 'var(--head)', fontWeight: 600, fontSize: 13,
              transition: 'all 0.2s',
            }}>
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(13,31,15,0.7)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '28px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg, var(--lime), var(--acid))',
          }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}
                >
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--mist)', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>FULL NAME</label>
                    <input style={inputStyle} type="text" placeholder="Manvi Garg" value={form.name}
                      onChange={e => set('name', e.target.value)} required
                      onFocus={e => e.target.style.borderColor = 'rgba(168,224,99,0.5)'}
                      onBlur={e => e.target.style.borderColor = 'rgba(168,224,99,0.18)'} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mist)', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>PHONE</label>
                      <input style={inputStyle} type="tel" placeholder="+91 99999 00000" value={form.phone}
                        onChange={e => set('phone', e.target.value)}
                        onFocus={e => e.target.style.borderColor = 'rgba(168,224,99,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(168,224,99,0.18)'} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mist)', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>CITY</label>
                      <input style={inputStyle} type="text" placeholder="Indore" value={form.city}
                        onChange={e => set('city', e.target.value)}
                        onFocus={e => e.target.style.borderColor = 'rgba(168,224,99,0.5)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(168,224,99,0.18)'} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label style={{ fontSize: 11, color: 'var(--mist)', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} required
                onFocus={e => e.target.style.borderColor = 'rgba(168,224,99,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(168,224,99,0.18)'} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--mist)', letterSpacing: '1px', display: 'block', marginBottom: 6 }}>PASSWORD</label>
              <input style={inputStyle} type="password" placeholder="Min 6 characters" value={form.password}
                onChange={e => set('password', e.target.value)} required minLength={6}
                onFocus={e => e.target.style.borderColor = 'rgba(168,224,99,0.5)'}
                onBlur={e => e.target.style.borderColor = 'rgba(168,224,99,0.18)'} />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 9,
                background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)',
                color: '#ff8888', fontSize: 13,
              }}>⚠ {error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              marginTop: 6, padding: '13px',
              background: loading ? 'rgba(168,224,99,0.4)' : 'var(--lime)',
              border: 'none', borderRadius: 10, color: 'var(--ink)',
              fontFamily: 'var(--head)', fontWeight: 700, fontSize: 14,
              transition: 'all 0.2s',
            }}>
              {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--mist)', marginTop: 18 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{
            background: 'none', border: 'none', color: 'var(--lime)',
            fontWeight: 600, fontSize: 12, padding: 0,
          }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
