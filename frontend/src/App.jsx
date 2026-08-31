import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar    from './components/Navbar'
import Home      from './pages/Home'
import Auth      from './pages/Auth'
import Scan      from './pages/Scan'
import Dashboard from './pages/Dashboard'
import Settings  from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mist)', fontSize: 14 }}>
      Loading…
    </div>
  )
  return user ? children : <Navigate to="/auth" replace />
}

function AppRoutes() {
  const location  = useLocation()
  const { user }  = useAuth()
  const hideNav   = location.pathname === '/auth'

  return (
    <>
      {!hideNav && <Navbar />}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/auth"      element={user ? <Navigate to="/" /> : <Auth />} />
          <Route path="/"          element={<Home />} />
          <Route path="/scan"      element={<ProtectedRoute><Scan /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="*"          element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
