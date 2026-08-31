import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getProfile } from '../lib/supabase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (u) => {
    try {
      const p = await getProfile(u.id)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadProfile(u)
      else   setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = () => user && loadProfile(user)

  return (
    <AuthCtx.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
