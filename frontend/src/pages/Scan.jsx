import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import ScanFrame from '../components/ScanFrame'
import ResultCard from '../components/ResultCard'
import SwanOrbit from '../components/SwanOrbit'
import Footer from '../components/Footer'
import usePredict from '../hooks/usePredict'
import { useAuth } from '../context/AuthContext'
import { saveScan } from '../lib/supabase'

const CLASS_COLORS = {
  plastic:  '#a8e063',
  paper:    '#7dd6f0',
  metal:    '#c6f135',
  glass:    '#a78bfa',
  food:     '#4ade80',
  battery:  '#fab900',
}

// Draws bounding boxes scaled to the DISPLAYED size of the image
function drawBoxes(canvas, imgEl, detections) {
  if (!canvas || !imgEl || !detections?.length) return

  const dispW = imgEl.offsetWidth
  const dispH = imgEl.offsetHeight
  const natW  = imgEl.naturalWidth  || dispW
  const natH  = imgEl.naturalHeight || dispH

  // Scale factors: model coords → displayed pixels
  const scaleX = dispW / natW
  const scaleY = dispH / natH

  canvas.width  = dispW
  canvas.height = dispH

  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, dispW, dispH)

  detections.forEach(d => {
    const color = CLASS_COLORS[d.class] || '#a8e063'

    const x1 = d.bbox.x1 * scaleX
    const y1 = d.bbox.y1 * scaleY
    const x2 = d.bbox.x2 * scaleX
    const y2 = d.bbox.y2 * scaleY
    const bw  = x2 - x1
    const bh  = y2 - y1

    // Semi-transparent fill
    ctx.fillStyle = color + '18'
    ctx.fillRect(x1, y1, bw, bh)

    // Box border
    ctx.strokeStyle = color
    ctx.lineWidth   = 2
    ctx.strokeRect(x1, y1, bw, bh)

    // Corner brackets
    const cs = Math.min(bw * 0.22, bh * 0.22, 20)
    ctx.strokeStyle = color
    ctx.lineWidth   = 3
    ctx.lineCap     = 'round'
    ;[
      [[x1, y1 + cs], [x1, y1],  [x1 + cs, y1]],
      [[x2 - cs, y1], [x2, y1],  [x2, y1 + cs]],
      [[x1, y2 - cs], [x1, y2],  [x1 + cs, y2]],
      [[x2 - cs, y2], [x2, y2],  [x2 - cs, y2]],
    ].forEach(([a, b, c]) => {
      ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.stroke()
    })

    // Label pill — material + confidence
    const label    = `${d.material}  ${d.confidence_pct}`
    const fontSize = Math.max(10, Math.min(13, bw / 7))
    ctx.font       = `700 ${fontSize}px 'Space Grotesk', system-ui, sans-serif`
    const textW    = ctx.measureText(label).width
    const pillW    = textW + 16
    const pillH    = fontSize + 10

    // Place above box; if not enough room, place inside top edge
    const pillX = x1
    const pillY = y1 - pillH - 4 >= 0 ? y1 - pillH - 4 : y1 + 4

    ctx.fillStyle = color
    ctx.beginPath()
    if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, 4)
    else               ctx.rect(pillX, pillY, pillW, pillH)
    ctx.fill()

    ctx.fillStyle    = '#080f08'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, pillX + 8, pillY + pillH / 2)
  })
}

export default function Scan() {
  const { predict, result, loading, error, reset } = usePredict()
  const { user }  = useAuth()

  const [preview,   setPreview]   = useState(null)
  const [mode,      setMode]      = useState('upload')
  const [camActive, setCamActive] = useState(false)
  const [saving,    setSaving]    = useState(false)

  const fileRef   = useRef(null)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const imgRef    = useRef(null)
  const canvasRef = useRef(null)

  // Save to Supabase when result arrives
  useEffect(() => {
    if (result && user && !result.demo_mode) {
      setSaving(true)
      saveScan(user.id, result).finally(() => setSaving(false))
    }
  }, [result, user])

  // Draw boxes whenever result changes or image loads
  const redrawBoxes = useCallback(() => {
    if (result?.detections?.length && imgRef.current && canvasRef.current) {
      drawBoxes(canvasRef.current, imgRef.current, result.detections)
    }
  }, [result])

  useEffect(() => { redrawBoxes() }, [redrawBoxes])

  // Re-draw on window resize so boxes stay aligned
  useEffect(() => {
    window.addEventListener('resize', redrawBoxes)
    return () => window.removeEventListener('resize', redrawBoxes)
  }, [redrawBoxes])

  // Cleanup camera on unmount
  useEffect(() => () => streamRef.current?.getTracks().forEach(t => t.stop()), [])

  const handleFile = useCallback((file) => {
    if (!file?.type.startsWith('image/')) return
    reset(); setPreview(URL.createObjectURL(file)); predict(file)
  }, [predict, reset])

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setCamActive(true)
    } catch (err) {
      alert(`Camera error: ${err.message}. Please allow camera access in your browser settings.`)
    }
  }

  const stopCam = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamActive(false)
  }

  const capture = () => {
    const video = videoRef.current; if (!video) return
    const c = document.createElement('canvas')
    c.width = video.videoWidth || 640; c.height = video.videoHeight || 480
    c.getContext('2d').drawImage(video, 0, 0)
    c.toBlob(blob => { reset(); setPreview(URL.createObjectURL(blob)); predict(blob); stopCam() }, 'image/jpeg', 0.92)
  }

  const handleReset = () => { reset(); setPreview(null); stopCam() }

  const btn = (variant, onClick, children, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '11px 22px', borderRadius: 50, fontSize: 13, fontWeight: 600,
      fontFamily: 'var(--head)', transition: 'all 0.2s', border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      ...(variant === 'primary'
        ? { background: 'var(--lime)', color: 'var(--ink)' }
        : { background: 'transparent', border: '1px solid rgba(168,224,99,0.3)', color: 'var(--lime)' }),
    }}>{children}</button>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 58px)', background: 'var(--ink)',
      }}>

        {/* ── LEFT ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '48px 44px 48px 60px',
          borderRight: '1px solid rgba(168,224,99,0.07)', overflowY: 'auto',
        }}>
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ display: 'inline-block', width: 28, height: 1, background: 'var(--lime)', opacity: 0.5 }} />
              <span style={{ fontSize: 11, letterSpacing: '3px', color: 'var(--lime)', fontWeight: 500 }}>WASTE SCANNER</span>
            </div>
            <h2 style={{ fontFamily: 'var(--head)', fontSize: 'clamp(28px, 3vw, 44px)', fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 10 }}>
              <span style={{ color: 'var(--cream)' }}>Show swan</span><br />
              <span style={{ color: 'var(--acid)' }}>your waste.</span>
            </h2>
            <p style={{ fontSize: 14, color: 'var(--mist)', marginBottom: 26, lineHeight: 1.7, fontWeight: 300 }}>
              Upload an image or use your camera. Swan detects and labels each item with a bounding box.
            </p>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {['upload', 'webcam'].map(m => (
                <button key={m} onClick={() => { setMode(m); handleReset() }} style={{
                  padding: '8px 20px', borderRadius: 50, fontFamily: 'var(--head)',
                  border: `1px solid ${mode === m ? 'rgba(168,224,99,0.5)' : 'rgba(168,224,99,0.15)'}`,
                  background: mode === m ? 'rgba(168,224,99,0.1)' : 'transparent',
                  color: mode === m ? 'var(--lime)' : 'var(--mist)',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {m === 'upload' ? '↑ Upload' : '⊙ Camera'}
                </button>
              ))}
            </div>

            {mode === 'upload' && (
              <div
                onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '1.5px dashed rgba(168,224,99,0.22)', borderRadius: 14,
                  padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(13,31,15,0.4)', transition: 'all 0.2s', marginBottom: 14,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,224,99,0.48)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(168,224,99,0.22)'}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🦢</div>
                <div style={{ fontSize: 14, color: 'var(--cream)', marginBottom: 4, fontWeight: 500 }}>Drop image here</div>
                <div style={{ fontSize: 12, color: 'var(--mist)' }}>or click to browse — JPG, PNG, WEBP</div>
                <input ref={fileRef} type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
              </div>
            )}

            {mode === 'webcam' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: '1px solid rgba(168,224,99,0.2)',
                  background: 'rgba(13,31,15,0.6)', marginBottom: 12,
                  aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: camActive ? 'block' : 'none', borderRadius: 14 }}
                  />
                  {!camActive && <span style={{ color: 'var(--mist)', fontSize: 13 }}>Camera is off</span>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {!camActive
                    ? btn('primary', startCam, '⊙ Start Camera')
                    : <>{btn('primary', capture, '📸 Capture')}{btn('ghost', stopCam, 'Stop')}</>
                  }
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 14, padding: '11px 14px', borderRadius: 10, background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.22)', color: '#ff9090', fontSize: 13 }}>
                ⚠ {error} — is your backend running on port 8000?
              </div>
            )}
            {saving && <div style={{ fontSize: 12, color: 'var(--lime)', marginBottom: 10 }}>Saving to your dashboard…</div>}
            {(preview || result) && btn('ghost', handleReset, '↺ Scan another')}
          </motion.div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'flex-start', padding: '48px 60px 48px 44px',
          gap: 20, overflowY: 'auto',
          background: 'radial-gradient(ellipse at center, rgba(13,31,15,0.6) 0%, var(--ink) 70%)',
        }}>

          {/* Empty state */}
          {!preview && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20%' }}
            >
              <SwanOrbit size={240} />
              <p style={{ color: 'var(--mist)', fontSize: 13, marginTop: 16, textAlign: 'center' }}>Waiting for an image…</p>
            </motion.div>
          )}

          {/* Scanning spinner */}
          {loading && (
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
            >
              <ScanFrame active size={280}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <SwanOrbit size={180} spinning />
                </div>
              </ScanFrame>
              <p style={{ fontSize: 11, color: 'var(--lime)', letterSpacing: '2px' }}>ANALYZING…</p>
            </motion.div>
          )}

          {/* Image + bounding box canvas overlay */}
          {preview && !loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}
              style={{
                position: 'relative', width: '100%', maxWidth: 420,
                borderRadius: 16, overflow: 'hidden',
                border: '1px solid rgba(168,224,99,0.2)',
                background: 'rgba(13,31,15,0.5)',
              }}
            >
              {/* The image */}
              <img
                ref={imgRef}
                src={preview}
                alt="scan result"
                onLoad={redrawBoxes}
                style={{ display: 'block', width: '100%', height: 'auto', borderRadius: 16 }}
              />

              {/* Canvas sits pixel-perfect on top of the image */}
              <canvas
                ref={canvasRef}
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: '100%', height: '100%',
                  borderRadius: 16, pointerEvents: 'none',
                }}
              />

              {/* No detections overlay */}
              {result && result.total_detected === 0 && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', background: 'rgba(8,15,8,0.65)', borderRadius: 16,
                }}>
                  <div style={{ textAlign: 'center', color: 'var(--mist)', fontSize: 13 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>🦢</div>
                    No waste detected — try a clearer image
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Result cards */}
          {result && result.total_detected > 0 && (
            <div style={{ width: '100%', maxWidth: 420 }}>
              <ResultCard result={result} />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
