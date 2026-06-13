import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(false)   // true while the user is resetting a forgotten password

  async function loadProfile(uid) {
    if (!uid) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
      await loadProfile(s?.user?.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    recovery,
    refreshProfile: () => loadProfile(session?.user?.id),
    signUp: (email, password, fullName) =>
      supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
    // password reset: send the recovery email via our Brevo Edge Function (same as notify-email),
    // then set the new password from the recovery session that the email link opens.
    resetPassword: (email) =>
      supabase.functions.invoke('reset-password', { body: { email: email.trim() } }),
    updatePassword: async (password) => {
      const res = await supabase.auth.updateUser({ password })
      if (!res.error) setRecovery(false)
      return res
    },
    cancelRecovery: () => setRecovery(false),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
