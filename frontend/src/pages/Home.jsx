import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import SwanOrbit from '../components/SwanOrbit'
import Footer from '../components/Footer'
import { useAuth } from '../context/AuthContext'

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
})

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 58px)',
        background: 'var(--ink)',
      }}>
        {/* Left */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '60px 48px 60px 60px',
          borderRight: '1px solid rgba(168,224,99,0.07)',
        }}>
          <motion.div {...fade(0)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span style={{ display: 'inline-block', width: 28, height: 1, background: 'var(--lime)', opacity: 0.5 }} />
            <span style={{ fontSize: 11, letterSpacing: '3px', color: 'var(--lime)', fontWeight: 500 }}>SWAN'S INTELLIGENCE</span>
          </motion.div>

          <motion.h1 {...fade(1)} style={{
            fontFamily: 'var(--head)', fontSize: 'clamp(42px, 5vw, 68px)',
            fontWeight: 800, lineHeight: 1.0, letterSpacing: '-2px', marginBottom: 24,
          }}>
            <span style={{ color: 'var(--cream)' }}>Segregate,</span><br />
            <span style={{ color: 'var(--acid)' }}>Optimize,</span><br />
            <span style={{ color: 'var(--lime)' }}>Sustain.</span>
          </motion.h1>

          <motion.p {...fade(2)} style={{
            fontSize: 15, lineHeight: 1.8, color: 'var(--mist)',
            maxWidth: 400, marginBottom: 40, fontWeight: 300,
          }}>
            SwanSorts uses a custom-trained YOLOv8 model to detect and classify your waste like plastic, metal, glass, food & more, all while calculating your carbon footprint in real time.
          </motion.p>

          <motion.div {...fade(3)} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 52 }}>
            <button onClick={() => nav(user ? '/scan' : '/auth')} style={{
              padding: '13px 30px', borderRadius: 50, border: 'none',
              background: 'var(--lime)', color: 'var(--ink)',
              fontFamily: 'var(--head)', fontWeight: 700, fontSize: 13,
              transition: 'all 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--acid)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--lime)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              {user ? 'Try Live Scan →' : 'Get Started →'}
            </button>
            <button onClick={() => nav(user ? '/dashboard' : '/auth')} style={{
              padding: '13px 26px', borderRadius: 50, background: 'transparent',
              border: '1px solid rgba(168,224,99,0.3)', color: 'var(--lime)',
              fontFamily: 'var(--head)', fontWeight: 600, fontSize: 13,
              transition: 'all 0.25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.background = 'rgba(168,224,99,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,224,99,0.3)'; e.currentTarget.style.background = 'transparent' }}
            >
              View Dashboard
            </button>
          </motion.div>

          <motion.div {...fade(4)} style={{
            display: 'flex', gap: 36,
            paddingTop: 28, borderTop: '1px solid rgba(168,224,99,0.1)',
          }}>
            {[
              { num: '6',   lbl: 'Waste classes' },
              { num: '94%', lbl: 'Accuracy' },
              { num: 'YOLOv8', lbl: 'Detection model' },
            ].map(({ num, lbl }) => (
              <div key={lbl}>
                <div style={{ fontFamily: 'var(--head)', fontSize: 22, fontWeight: 800, color: 'var(--acid)' }}>{num}</div>
                <div style={{ fontSize: 11, color: 'var(--mist)', marginTop: 3 }}>{lbl}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(ellipse at center, rgba(26,51,32,0.55) 0%, var(--ink) 70%)',
        }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <SwanOrbit size={320} />
          </motion.div>
          {[
            { label: 'Plastic',   top: '20%', left: '6%',   delay: 0.5 },
            { label: 'Metal',     top: '36%', right: '6%',  delay: 0.65 },
            { label: 'Organic',   bottom: '28%', left: '5%', delay: 0.8 },
            { label: 'Glass',     bottom: '20%', right: '8%', delay: 0.7 },
          ].map(({ label, delay, ...pos }) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay, duration: 0.5 }}
              style={{
                position: 'absolute', ...pos,
                padding: '6px 14px', borderRadius: 50,
                background: 'rgba(13,31,15,0.85)',
                border: '1px solid rgba(168,224,99,0.2)',
                fontSize: 12, color: 'var(--lime)',
                backdropFilter: 'blur(8px)',
              }}
            >{label}</motion.div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
