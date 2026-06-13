import { useState } from 'react'
import { useAuth } from '../auth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin')
  const [f, setF] = useState({ email: '', password: '', fullName: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
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
        <div className="tag">Plan, track, and ship work — together.</div>
        {err && <div className="err">{err}</div>}
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <div className="field"><label>Full name</label>
              <input value={f.fullName} onChange={set('fullName')} placeholder="Jane Doe" required /></div>
          )}
          <div className="field"><label>Email</label>
            <input type="email" value={f.email} onChange={set('email')} placeholder="you@company.com" required /></div>
          <div className="field"><label>Password</label>
            <input type="password" value={f.password} onChange={set('password')} placeholder="••••••••" required minLength={6} /></div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="switch">
          {mode === 'signin' ? "New here?" : 'Have an account?'}{' '}
          <button onClick={() => { setErr(''); setMode(mode === 'signin' ? 'signup' : 'signin') }}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
