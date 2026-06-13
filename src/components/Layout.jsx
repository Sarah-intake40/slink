import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { useWorkspace } from '../workspace'
import { useTheme } from '../theme'
import Sidebar from './Sidebar'
import Toaster from './Toaster'
import CommandPalette from './CommandPalette'
import { Avatar } from './Bits'

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

export default function Layout() {
  const { profile, signOut } = useAuth()
  const { loading } = useWorkspace()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <button className="topbar-search" onClick={() => window.dispatchEvent(new Event('cmdk:open'))}>
            <span>🔍</span><span className="ph">Search…</span>
            <kbd className="topbar-kbd">{isMac ? '⌘' : 'Ctrl'} K</kbd>
          </button>
          <div className="spacer" />
          <div className="who">
            <button className="icon-btn" onClick={toggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
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
      <CommandPalette />
    </div>
  )
}
