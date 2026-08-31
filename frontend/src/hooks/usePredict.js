import { useState, useCallback } from 'react'
import { API_BASE } from '../utils/constants'

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
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Prediction failed')
      }
      const data = await res.json()
      setResult(data)
    } catch (e) {
      setError(e.message)
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
