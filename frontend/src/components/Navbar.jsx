import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signOut } from '../lib/supabase'

const links = [
  { to: '/',          label: 'Home'      },
  { to: '/scan',      label: 'Scan'      },
  { to: '/dashboard', label: 'Dashboard' },
]

export default function Navbar() {
  const { user, profile } = useAuth()
  const nav = useNavigate()

  const handleLogout = async () => {
    await signOut()
    nav('/auth')
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?'

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 44px', height: 58,
      background: 'rgba(8,15,8,0.9)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(168,224,99,0.09)',
    }}>
      <NavLink to="/">
        <span style={{ fontFamily: 'var(--head)', fontSize: 18, fontWeight: 800, color: 'var(--lime)', letterSpacing: '-0.5px' }}>
          🦢 SwanSorts
        </span>
      </NavLink>

      <div style={{ display: 'flex', gap: 4 }}>
        {links.map(({ to, label }) => (
          <NavLink key={to} to={to}>
            {({ isActive }) => (
              <span style={{
                padding: '6px 16px', borderRadius: 50, fontSize: 13, fontWeight: 500,
                border: isActive ? '1px solid rgba(168,224,99,0.45)' : '1px solid transparent',
                background: isActive ? 'rgba(168,224,99,0.08)' : 'transparent',
                color: isActive ? 'var(--lime)' : 'var(--mist)',
                transition: 'all 0.2s', display: 'inline-block',
              }}>{label}</span>
            )}
          </NavLink>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <NavLink to="/settings">
              {({ isActive }) => (
                <div title="Settings" style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: profile?.avatar_url ? 'transparent' : 'rgba(45,90,53,0.7)',
                  border: `1.5px solid ${isActive ? 'var(--lime)' : 'rgba(168,224,99,0.28)'}`,
                  overflow: 'hidden', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
                }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="pfp" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)' }}>{initials}</span>
                  }
                </div>
              )}
            </NavLink>
            <button onClick={handleLogout} style={{
              padding: '6px 14px', borderRadius: 50, fontSize: 12, fontWeight: 500,
              background: 'transparent', border: '1px solid rgba(255,100,100,0.2)',
              color: 'rgba(255,140,140,0.7)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,100,100,0.5)'; e.currentTarget.style.color = '#ff9090' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,100,100,0.2)'; e.currentTarget.style.color = 'rgba(255,140,140,0.7)' }}
            >Logout</button>
          </>
        ) : (
          <button onClick={() => nav('/auth')} style={{
            padding: '7px 18px', borderRadius: 50, fontSize: 13, fontWeight: 600,
            background: 'var(--lime)', color: 'var(--ink)', border: 'none',
          }}>Log in</button>
        )}
      </div>
    </nav>
  )
}
