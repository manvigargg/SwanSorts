import { useEffect, useRef } from 'react'

export default function ScanFrame({ active = false, children, size = 260 }) {
  const beamRef = useRef(null)

  useEffect(() => {
    if (!beamRef.current) return
    if (active) {
      beamRef.current.style.animation = 'beamScan 1.6s ease-in-out infinite'
    } else {
      beamRef.current.style.animation = 'none'
      beamRef.current.style.top = '0'
    }
  }, [active])

  return (
    <div style={{
      position: 'relative', width: size, height: size,
      border: `1.5px solid ${active ? 'rgba(168,224,99,0.5)' : 'rgba(168,224,99,0.2)'}`,
      borderRadius: '16px',
      transition: 'border-color 0.4s',
      overflow: 'hidden',
      background: 'rgba(13,31,15,0.5)',
    }}>
      {/* Corner brackets */}
      {[
        { top: -2, left: -2,  borderTop: true,    borderLeft: true  },
        { top: -2, right: -2, borderTop: true,    borderRight: true },
        { bottom: -2, left: -2,  borderBottom: true, borderLeft: true  },
        { bottom: -2, right: -2, borderBottom: true, borderRight: true },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', width: 22, height: 22,
          ...(c.top    !== undefined ? { top:    c.top }    : {}),
          ...(c.bottom !== undefined ? { bottom: c.bottom } : {}),
          ...(c.left   !== undefined ? { left:   c.left }   : {}),
          ...(c.right  !== undefined ? { right:  c.right }  : {}),
          borderTop:    c.borderTop    ? '2.5px solid var(--lime)' : undefined,
          borderBottom: c.borderBottom ? '2.5px solid var(--lime)' : undefined,
          borderLeft:   c.borderLeft   ? '2.5px solid var(--lime)' : undefined,
          borderRight:  c.borderRight  ? '2.5px solid var(--lime)' : undefined,
          borderRadius: c.borderTop && c.borderLeft ? '5px 0 0 0' :
                        c.borderTop && c.borderRight ? '0 5px 0 0' :
                        c.borderBottom && c.borderLeft ? '0 0 0 5px' : '0 0 5px 0',
        }} />
      ))}

      {/* Scan beam */}
      <div ref={beamRef} style={{
        position: 'absolute', left: 8, right: 8, height: 2,
        background: 'linear-gradient(90deg, transparent, var(--lime), transparent)',
        top: 0, borderRadius: 1,
        opacity: active ? 1 : 0,
      }} />

      <style>{`
        @keyframes beamScan {
          0%   { top: 0;    opacity: 0 }
          8%   { opacity: 1 }
          92%  { opacity: 1 }
          100% { top: 100%; opacity: 0 }
        }
      `}</style>

      {children}
    </div>
  )
}
