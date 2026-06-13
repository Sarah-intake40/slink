import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'

// Shown after the user clicks the recovery link in their email (auth is in PASSWORD_RECOVERY state).
// Submitting writes the new password to the auth database via supabase.auth.updateUser.
export default function ResetPassword() {
  const { updatePassword, cancelRecovery } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (pw.length < 6) return setErr('Password must be at least 6 characters.')
    if (pw !== pw2) return setErr('Passwords do not match.')
    setBusy(true)
    const { error } = await updatePassword(pw)
    setBusy(false)
    if (error) return setErr(error.message)
    nav('/', { replace: true })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand"><span className="mk">S</span>S&nbsp;<b>Link</b></div>
        <div className="tag">Choose a new password.</div>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>New password</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required minLength={6} autoFocus /></div>
          <div className="field"><label>Confirm new password</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" required minLength={6} /></div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
        <div className="switch">
          <button onClick={() => { cancelRecovery(); nav('/login', { replace: true }) }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
