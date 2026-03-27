import { motion } from 'framer-motion'

export default function ResultCard({ result }) {
  const { detections = [], total_detected, total_co2_saved, demo_mode } = result

  if (!detections.length) return (
    <div style={{ textAlign: 'center', color: 'var(--mist)', fontSize: 14, padding: 24 }}>
      No waste detected. Try a clearer image.
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}
    >
      {/* Summary bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(13,31,15,0.9)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 16px',
      }}>
        <span style={{ fontSize: 13, color: 'var(--mist)' }}>
          <span style={{ color: 'var(--acid)', fontWeight: 700, fontFamily: 'var(--head)' }}>{total_detected}</span> item{total_detected !== 1 ? 's' : ''} detected
        </span>
        <span style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600, fontFamily: 'var(--head)' }}>
          +{total_co2_saved} kg CO₂ saved
        </span>
        {demo_mode && (
          <span style={{
            fontSize: 10, padding: '3px 8px', borderRadius: 50,
            background: 'rgba(250,185,0,0.1)', border: '1px solid rgba(250,185,0,0.3)',
            color: '#fab900', letterSpacing: '1px',
          }}>DEMO</span>
        )}
      </div>

      {/* Detection cards */}
      {detections.map((d, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          style={{
            background: 'rgba(13,31,15,0.85)',
            border: '1px solid rgba(168,224,99,0.15)',
            borderRadius: 14, padding: '16px 18px',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
            background: d.color || 'var(--lime)', borderRadius: '14px 0 0 14px',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingLeft: 8 }}>
            <span style={{ fontSize: 28 }}>{d.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--head)', fontWeight: 700, fontSize: 15, color: 'var(--cream)' }}>
                  {d.material}
                </span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 50, letterSpacing: '1px',
                  background: d.waste_category === 'Recyclable' ? 'rgba(168,224,99,0.1)' :
                               d.waste_category === 'Biodegradable' ? 'rgba(0,200,100,0.1)' : 'rgba(250,185,0,0.1)',
                  border: `1px solid ${d.waste_category === 'Recyclable' ? 'rgba(168,224,99,0.3)' :
                                        d.waste_category === 'Biodegradable' ? 'rgba(0,200,100,0.3)' : 'rgba(250,185,0,0.3)'}`,
                  color: d.waste_category === 'Recyclable' ? 'var(--lime)' :
                          d.waste_category === 'Biodegradable' ? '#4ade80' : '#fab900',
                }}>
                  {d.waste_category}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--head)', fontWeight: 700, fontSize: 13, color: 'var(--acid)' }}>
                  {d.confidence_pct}
                </span>
              </div>
            </div>
          </div>

          {/* Disposal row */}
          <div style={{
            paddingLeft: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
          }}>
            <div style={{
              background: 'rgba(168,224,99,0.04)', border: '1px solid rgba(168,224,99,0.1)',
              borderRadius: 9, padding: '9px 12px',
            }}>
              <div style={{ fontSize: 9, color: 'var(--mist)', letterSpacing: '1.5px', marginBottom: 3 }}>DISPOSE IN</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cream)', fontFamily: 'var(--head)' }}>{d.disposal}</div>
            </div>
            <div style={{
              background: 'rgba(168,224,99,0.04)', border: '1px solid rgba(168,224,99,0.1)',
              borderRadius: 9, padding: '9px 12px',
            }}>
              <div style={{ fontSize: 9, color: 'var(--mist)', letterSpacing: '1.5px', marginBottom: 3 }}>CO₂ SAVED</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lime)', fontFamily: 'var(--head)' }}>{d.co2_saved_kg} kg</div>
            </div>
          </div>

          {/* Tip */}
          {d.tip && (
            <div style={{
              marginTop: 10, paddingLeft: 8,
              fontSize: 12, color: 'rgba(240,237,228,0.45)',
              lineHeight: 1.6,
            }}>
              💡 {d.tip}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}
