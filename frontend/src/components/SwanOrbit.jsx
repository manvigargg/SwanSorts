import { useEffect, useRef } from 'react'

export default function SwanOrbit({ size = 320, spinning = false }) {
  const swanRef = useRef(null)

  useEffect(() => {
    if (!swanRef.current) return
    let frame, angle = 0
    const speed = spinning ? 4 : 0.4

    const tick = () => {
      angle += speed * 0.01
      swanRef.current.style.transform = spinning
        ? `rotate(${angle * 57.3}deg)`
        : `translateY(${Math.sin(angle) * 12}px) rotate(${Math.sin(angle) * 4}deg)`
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [spinning])

  const r1 = size * 0.46
  const r2 = size * 0.36
  const cx = size / 2

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {/* Outer ring */}
      <svg style={{ position: 'absolute', inset: 0 }} width={size} height={size}>
        <circle cx={cx} cy={cx} r={r1} fill="none"
          stroke="rgba(168,224,99,0.1)" strokeWidth="1"
          strokeDasharray="4 8" />
        <circle cx={cx} cy={cx} r={r2} fill="none"
          stroke="rgba(198,241,53,0.07)" strokeWidth="1" />
        {/* Orbiting dots */}
        <circle cx={cx + r1} cy={cx} r="3" fill="var(--lime)" opacity="0.7">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cx}`} to={`360 ${cx} ${cx}`} dur="18s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx - r2} cy={cx} r="2.5" fill="var(--acid)" opacity="0.5">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cx}`} to={`-360 ${cx} ${cx}`} dur="11s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cx - r1} r="2" fill="var(--lime)" opacity="0.4">
          <animateTransform attributeName="transform" type="rotate"
            from={`0 ${cx} ${cx}`} to={`360 ${cx} ${cx}`} dur="25s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* Swan emoji */}
      <div ref={swanRef} style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.28,
        filter: spinning
          ? 'drop-shadow(0 0 20px rgba(168,224,99,0.8))'
          : 'drop-shadow(0 0 12px rgba(168,224,99,0.35))',
        transition: 'filter 0.5s',
        willChange: 'transform',
      }}>
        🦢
      </div>
    </div>
  )
}
