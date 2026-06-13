import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './auth'
import { WorkspaceProvider } from './workspace'
import { NotificationsProvider } from './notifications'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import ListPage from './pages/ListPage'
import SpacePage from './pages/SpacePage'
import UserPage from './pages/UserPage'
import Inbox from './pages/Inbox'
import DashboardPage from './pages/DashboardPage'
import CostsPage from './pages/CostsPage'
import InvoicesPage from './pages/InvoicesPage'
import ReportsPage from './pages/ReportsPage'

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="spin" />
  if (!session) return <Navigate to="/login" replace />
  return <WorkspaceProvider><NotificationsProvider>{children}</NotificationsProvider></WorkspaceProvider>
}

export default function App() {
  const { loading, session } = useAuth()
  if (loading) return <div className="spin" />
  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/costs" element={<CostsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/space/:spaceId" element={<SpacePage />} />
        <Route path="/user/:userId" element={<UserPage />} />
        <Route path="/list/:listId" element={<ListPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
