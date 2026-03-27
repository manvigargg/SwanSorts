import { createClient } from '@supabase/supabase-js'

// ── REPLACE THESE with your actual Supabase project values ──
// Get them from: https://supabase.com → your project → Settings → API
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signUp = async ({ email, password, name, phone, city }) => {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { name, phone, city }
    }
  })
  if (error) throw error

  // Insert profile row
  if (data.user) {
    await supabase.from('profiles').upsert({
      id:         data.user.id,
      email,
      name,
      phone,
      city,
      avatar_url: null,
      created_at: new Date().toISOString(),
    })
  }
  return data
}

export const signIn = async ({ email, password }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = () => supabase.auth.signOut()

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export const uploadAvatar = async (userId, file) => {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

// ── Scan record helpers ───────────────────────────────────────────────────────
export const saveScan = async (userId, scanResult) => {
  const rows = (scanResult.detections || []).map(d => ({
    user_id:        userId,
    material:       d.class,
    waste_category: d.waste_category,
    co2_saved:      d.co2_saved_kg,
    confidence:     d.confidence,
    scanned_at:     new Date().toISOString(),
  }))
  if (!rows.length) return
  const { error } = await supabase.from('scans').insert(rows)
  if (error) throw error
}

export const getUserStats = async (userId) => {
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false })
  if (error) throw error

  const total_scans   = data.length
  const total_co2     = data.reduce((s, r) => s + (r.co2_saved || 0), 0)
  const total_water   = total_scans * 18
  const by_category   = {}

  data.forEach(r => {
    by_category[r.material] = (by_category[r.material] || 0) + 1
  })

  return { total_scans, total_co2: +total_co2.toFixed(2), total_water, by_category, recent: data.slice(0, 20) }
}
