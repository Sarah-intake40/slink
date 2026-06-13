import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Project from './pages/Project'
import Team from './pages/Team'

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="spin" />
  if (!session) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { loading, session } = useAuth()
  if (loading) return <div className="spin" />
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/project/:id" element={<Protected><Project /></Protected>} />
      <Route path="/team" element={<Protected><Team /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
