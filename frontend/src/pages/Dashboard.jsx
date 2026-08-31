import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'
import { getUserStats } from '../lib/supabase'

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] },
})

const CLASS_COLORS = {
  plastic: '#a8e063', paper: '#a8e063', metal: '#c6f135',
  glass: '#7dd6f0', food: '#4ade80', battery: '#fab900',
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserStats(user.id)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const greeting = profile?.name ? `Hey, ${profile.name.split(' ')[0]}` : 'Hey there'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ink)' }}>
      <div style={{ flex: 1, maxWidth: 960, margin: '0 auto', width: '100%', padding: '44px 44px 60px' }}>

        {/* Header */}
        <motion.div {...fade(0)} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'var(--lime)', opacity: 0.5 }} />
            <span style={{ fontSize: 11, letterSpacing: '3px', color: 'var(--lime)', fontWeight: 500 }}>YOUR IMPACT</span>
          </div>
          <h2 style={{ fontFamily: 'var(--head)', fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.05 }}>
            <span style={{ color: 'var(--cream)' }}>{greeting}.</span><br />
            <span style={{ color: 'var(--acid)' }}>Your footprint.</span>
          </h2>
        </motion.div>

        {loading ? (
          <div style={{ color: 'var(--mist)', fontSize: 14, padding: '40px 0' }}>Loading your stats…</div>
        ) : !stats || stats.total_scans === 0 ? (
          <motion.div {...fade(1)} style={{
            padding: '48px', textAlign: 'center',
            background: 'rgba(13,31,15,0.5)', border: '1px solid var(--border)',
            borderRadius: 18,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦢</div>
            <div style={{ fontFamily: 'var(--head)', fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>No scans yet</div>
            <div style={{ fontSize: 14, color: 'var(--mist)' }}>Head to the Scan page to start classifying waste and building your dashboard.</div>
          </motion.div>
        ) : (
          <>
            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: 14, marginBottom: 22 }}>
              {[
                { icon: '♻️', val: stats.total_scans, unit: '', lbl: 'Items Scanned', delta: 'Total detections' },
                { icon: '🌿', val: stats.total_co2.toFixed(2), unit: ' kg', lbl: 'CO₂ Saved', delta: 'From correct disposal' },
                { icon: '💧', val: stats.total_water, unit: ' L', lbl: 'Water Conserved', delta: 'Estimated savings' },
                { icon: '🔥', val: Object.keys(stats.by_category).length, unit: '', lbl: 'Waste Types Found', delta: 'Unique categories' },
              ].map((m, i) => (
                <motion.div key={m.lbl} {...fade(i + 1)} style={{
                  background: 'rgba(13,31,15,0.7)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '20px', position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--lime), var(--acid))', borderRadius: '16px 16px 0 0' }} />
                  <div style={{ fontSize: 20, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ fontFamily: 'var(--head)', fontSize: 28, fontWeight: 800, color: 'var(--lime)', lineHeight: 1 }}>
                    {m.val}<span style={{ fontSize: 14, fontWeight: 500 }}>{m.unit}</span>
                  </div>
                  <div style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--mist)', margin: '5px 0 4px' }}>{m.lbl.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(168,224,99,0.5)' }}>{m.delta}</div>
                </motion.div>
              ))}
            </div>

            {/* Breakdown */}
            <motion.div {...fade(5)} style={{
              background: 'rgba(13,31,15,0.5)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '26px', marginBottom: 18,
            }}>
              <div style={{ fontSize: 10, letterSpacing: '3px', color: 'var(--mist)', marginBottom: 20, fontWeight: 500 }}>WASTE BREAKDOWN</div>
              {Object.entries(stats.by_category).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => {
                const pct = Math.round((count / stats.total_scans) * 100)
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 13 }}>
                    <div style={{ width: 76, fontSize: 12, color: 'var(--mist)', textAlign: 'right', textTransform: 'capitalize', fontWeight: 500 }}>{cat}</div>
                    <div style={{ flex: 1, height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', borderRadius: 4, background: CLASS_COLORS[cat] || 'var(--lime)' }}
                      />
                    </div>
                    <div style={{ fontSize: 12, fontFamily: 'var(--head)', fontWeight: 700, color: 'var(--acid)', width: 44, textAlign: 'right' }}>
                      {count} <span style={{ fontSize: 10, color: 'var(--mist)', fontWeight: 400 }}>({pct}%)</span>
                    </div>
                  </div>
                )
              })}
            </motion.div>

            {/* Recent scans */}
            {stats.recent?.length > 0 && (
              <motion.div {...fade(6)} style={{
                background: 'rgba(13,31,15,0.5)', border: '1px solid var(--border)',
                borderRadius: 16, padding: '26px',
              }}>
                <div style={{ fontSize: 10, letterSpacing: '3px', color: 'var(--mist)', marginBottom: 18, fontWeight: 500 }}>RECENT SCANS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.recent.slice(0, 8).map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(168,224,99,0.03)',
                      border: '1px solid rgba(168,224,99,0.07)',
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: CLASS_COLORS[s.material] || 'var(--lime)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)', textTransform: 'capitalize', flex: 1 }}>{s.material}</span>
                      <span style={{ fontSize: 11, color: 'var(--mist)', padding: '2px 8px', borderRadius: 50, background: 'rgba(255,255,255,0.04)' }}>{s.waste_category}</span>
                      <span style={{ fontSize: 11, color: 'var(--lime)', fontFamily: 'var(--head)', fontWeight: 600 }}>+{s.co2_saved} kg CO₂</span>
                      <span style={{ fontSize: 11, color: 'rgba(240,237,228,0.3)' }}>
                        {new Date(s.scanned_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}
