import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { updateProfile, uploadAvatar, signOut } from '../lib/supabase'

const inputStyle = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(13,31,15,0.7)',
  border: '1px solid rgba(168,224,99,0.18)',
  borderRadius: 10, color: 'var(--cream)',
  fontSize: 14, fontFamily: 'var(--body)',
  transition: 'border-color 0.2s',
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name:  profile?.name  || '',
    phone: profile?.phone || '',
    city:  profile?.city  || '',
  })
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [avatarFile,    setAvatarFile]    = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true); setError(''); setSuccess(false)
    try {
      let avatar_url = profile?.avatar_url || null
      if (avatarFile) {
        avatar_url = await uploadAvatar(user.id, avatarFile)
      }
      await updateProfile(user.id, { ...form, avatar_url })
      refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut(); nav('/auth')
  }

  const initials = form.name
    ? form.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ink)' }}>
      <div style={{ flex: 1, maxWidth: 640, margin: '0 auto', width: '100%', padding: '44px 28px 60px' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'var(--lime)', opacity: 0.5 }} />
            <span style={{ fontSize: 11, letterSpacing: '3px', color: 'var(--lime)', fontWeight: 500 }}>ACCOUNT</span>
          </div>
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 32, fontWeight: 800, letterSpacing: '-1px', color: 'var(--cream)' }}>
            Settings
          </h2>
          <p style={{ fontSize: 13, color: 'var(--mist)', marginTop: 6 }}>{user?.email}</p>
        </motion.div>

        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          style={{
            background: 'rgba(13,31,15,0.7)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '24px', marginBottom: 16,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--lime), var(--acid))' }} />
          <div style={{ fontSize: 10, letterSpacing: '2px', color: 'var(--mist)', marginBottom: 16, fontWeight: 500 }}>PROFILE PHOTO</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%', cursor: 'pointer',
                border: '2px dashed rgba(168,224,99,0.35)',
                background: avatarPreview ? 'transparent' : 'rgba(45,90,53,0.3)',
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.2s', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--lime)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(168,224,99,0.35)'}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: 'var(--head)', fontSize: 24, fontWeight: 800, color: 'var(--lime)' }}>{initials}</span>
              }
            </div>
            <div>
              <button onClick={() => fileRef.current?.click()} style={{
                padding: '8px 18px', borderRadius: 50, background: 'transparent',
                border: '1px solid rgba(168,224,99,0.3)', color: 'var(--lime)',
                fontFamily: 'var(--head)', fontWeight: 600, fontSize: 12,
                transition: 'all 0.2s', display: 'block', marginBottom: 6,
              }}>Upload Photo</button>
              <p style={{ fontSize: 11, color: 'var(--mist)' }}>JPG or PNG, max 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>
        </motion.div>

        {/* Profile details */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14 }}
          style={{
            background: 'rgba(13,31,15,0.7)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '24px', marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 10, letterSpacing: '2px', color: 'var(--mist)', marginBottom: 18, fontWeight: 500 }}>PERSONAL DETAILS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'name',  label: 'FULL NAME', type: 'text',  placeholder: 'Your Name' },
              { key: 'phone', label: 'PHONE',     type: 'tel',   placeholder: '+91 99999 00000' },
              { key: 'city',  label: 'CITY',      type: 'text',  placeholder: 'Your City' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: 10, color: 'var(--mist)', letterSpacing: '1.5px', display: 'block', marginBottom: 6 }}>{label}</label>
                <input
                  style={inputStyle} type={type} value={form[key]}
                  onChange={e => set(key, e.target.value)} placeholder={placeholder}
                  onFocus={e => e.target.style.borderColor = 'rgba(168,224,99,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(168,224,99,0.18)'}
                />
              </div>
            ))}

            {/* Email read-only */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--mist)', letterSpacing: '1.5px', display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} type="email" value={user?.email || ''} disabled />
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          {error && (
            <div style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.22)',
              color: '#ff9090', fontSize: 13,
            }}>⚠ {error}</div>
          )}
          {success && (
            <div style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              background: 'rgba(168,224,99,0.08)', border: '1px solid rgba(168,224,99,0.25)',
              color: 'var(--lime)', fontSize: 13,
            }}>✓ Profile saved!</div>
          )}

          <button onClick={handleSave} disabled={saving} style={{
            flex: 1, padding: '13px', borderRadius: 10, border: 'none',
            background: saving ? 'rgba(168,224,99,0.4)' : 'var(--lime)',
            color: 'var(--ink)', fontFamily: 'var(--head)', fontWeight: 700, fontSize: 14,
            transition: 'all 0.2s',
          }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          <button onClick={handleLogout} style={{
            padding: '13px 24px', borderRadius: 10,
            background: 'transparent',
            border: '1px solid rgba(255,100,100,0.25)',
            color: '#ff9090', fontFamily: 'var(--head)', fontWeight: 600, fontSize: 14,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,100,100,0.5)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,100,100,0.25)' }}
          >
            Log Out
          </button>
        </motion.div>
      </div>
      <Footer />
    </div>
  )
}
