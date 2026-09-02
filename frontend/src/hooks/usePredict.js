import { useState, useCallback } from 'react'

export default function usePredict() {
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const predict = useCallback(async (imageBlob) => {
    setLoading(true)
    setResult(null)
    setError(null)

    const formData = new FormData()
    formData.append('file', imageBlob, 'scan.jpg')

    try {
      // 120 second timeout to handle Render cold start
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)

      const res = await fetch('https://swansorts.onrender.com/predict', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Prediction failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Request timed out — backend is waking up, please try again in 30 seconds')
      } else {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setLoading(false)
  }, [])

  return { predict, result, loading, error, reset }
}