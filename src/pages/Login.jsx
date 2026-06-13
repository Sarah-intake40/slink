import { useState } from 'react'
import { useAuth } from '../auth'

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('signin')   // signin | signup | forgot
  const [f, setF] = useState({ email: '', password: '', fullName: '' })
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)       // forgot-password email sent
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const go = (m) => { setErr(''); setSent(false); setMode(m) }

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    if (mode === 'forgot') {
      const { error } = await resetPassword(f.email)
      setBusy(false)
      if (error) return setErr(error.message)
      return setSent(true)
    }
    const { error } = mode === 'signin'
      ? await signIn(f.email, f.password)
      : await signUp(f.email, f.password, f.fullName)
    setBusy(false)
    if (error) setErr(error.message)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand"><span className="mk">S</span>S&nbsp;<b>Link</b></div>
        <div className="tag">
          {mode === 'forgot' ? 'Reset your password.' : 'Plan, track, and ship work — together.'}
        </div>
        {err && <div className="err">{err}</div>}

        {mode === 'forgot' && sent ? (
          <>
            <div className="empty" style={{ padding: '28px 18px' }}>
              <div className="ic">📧</div>
              <p>If an account exists for <b>{f.email}</b>, a reset link is on its way. Check your inbox.</p>
            </div>
            <div className="switch"><button onClick={() => go('signin')}>Back to sign in</button></div>
          </>
        ) : (
          <>
            <form onSubmit={submit}>
              {mode === 'signup' && (
                <div className="field"><label>Full name</label>
                  <input value={f.fullName} onChange={set('fullName')} placeholder="Jane Doe" required /></div>
              )}
              <div className="field"><label>Email</label>
                <input type="email" value={f.email} onChange={set('email')} placeholder="you@company.com" required /></div>
              {mode !== 'forgot' && (
                <div className="field">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span>Password</span>
                    {mode === 'signin' && (
                      <button type="button" className="link-btn" onClick={() => go('forgot')}>Forgot password?</button>
                    )}
                  </label>
                  <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" required minLength={6} /></div>
              )}
              <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={busy}>
                {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
              </button>
            </form>
            <div className="switch">
              {mode === 'forgot' ? (
                <button onClick={() => go('signin')}>Back to sign in</button>
              ) : (
                <>
                  {mode === 'signin' ? 'New here?' : 'Have an account?'}{' '}
                  <button onClick={() => go(mode === 'signin' ? 'signup' : 'signin')}>
                    {mode === 'signin' ? 'Create an account' : 'Sign in'}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
