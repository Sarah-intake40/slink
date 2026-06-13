import { useState } from 'react'
import { useAuth } from '../auth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'in') {
        const { error } = await signIn(email, pw)
        if (error) setErr(error.message)
      } else {
        const { data, error } = await signUp(email, pw, name)
        if (error) setErr(error.message)
        else if (!data.session) setMsg('Account created. Check your email to confirm, then sign in.')
      }
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand"><span className="mk">S</span>S&nbsp;<b>Link</b></div>
        <p className="tag">Construction project management</p>
        {err && <div className="err">{err}</div>}
        {msg && <div className="note" style={{ marginBottom: 14 }}>{msg}</div>}
        {mode === 'up' && (
          <div className="field">
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Abdelsalam" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••••" />
        </div>
        <button className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }} disabled={busy} onClick={submit}>
          {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
        <div className="switch">
          {mode === 'in'
            ? <>No account yet? <button onClick={() => { setMode('up'); setErr('') }}>Create one</button></>
            : <>Already registered? <button onClick={() => { setMode('in'); setErr('') }}>Sign in</button></>}
        </div>
        {mode === 'up' && (
          <div className="note" style={{ marginTop: 16 }}>
            The first person to sign up becomes the <b>Project Manager</b> (admin). Everyone after is a Site Engineer until the PM changes their role.
          </div>
        )}
      </div>
    </div>
  )
}
