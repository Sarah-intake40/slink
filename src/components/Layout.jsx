import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useWorkspace } from '../workspace'
import Sidebar from './Sidebar'
import Toaster from './Toaster'
import { Avatar } from './Bits'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { loading } = useWorkspace()
  const nav = useNavigate()

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div className="spacer" />
          <div className="who">
            <Avatar name={profile?.full_name} size={32} />
            <button className="btn ghost sm" onClick={async () => { await signOut(); nav('/login') }}>Sign out</button>
          </div>
        </header>
        <main className="content">
          {loading ? <div className="spin" /> : <Outlet />}
        </main>
        <footer className="footer">S Link <span className="mono" style={{ opacity: .6 }}>v2.0-dev</span> · © copyrights <b>a7mdabdelsalam</b></footer>
      </div>
      <Toaster />
    </div>
  )
}
