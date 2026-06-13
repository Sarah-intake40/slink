import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Avatar, ROLE_LABEL } from './Bits'

export default function Layout({ children }) {
  const { profile, role, signOut } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  const on = (p) => (loc.pathname === p ? 'on' : '')

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand"><span className="mk">S</span>S&nbsp;<b>Link</b></Link>
        <nav className="topnav">
          <Link to="/" className={on('/')}>Projects</Link>
          {role === 'pm' && <Link to="/team" className={on('/team')}>Team</Link>}
        </nav>
        <div className="spacer" />
        <div className="who">
          <span className="role-pill">{ROLE_LABEL[role] || ''}</span>
          <Avatar name={profile?.full_name} size={34} />
          <button className="btn ghost sm" onClick={async () => { await signOut(); nav('/login') }}>Sign out</button>
        </div>
      </header>

      <main className="content">{children}</main>

      <footer className="footer">
        S Link <span className="mono" style={{ opacity: .6 }}>v1.0.0</span> — construction project management &nbsp;·&nbsp; © copyrights <b>a7mdabdelsalam</b>
      </footer>
    </div>
  )
}
