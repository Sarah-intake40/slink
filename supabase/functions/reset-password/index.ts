// ============================================================
//  S Link — Edge Function: password reset (via Brevo)
//  Called from the browser ("Forgot password?" on the login page).
//  Generates a Supabase recovery link with the admin API, then emails
//  it through Brevo (same provider as notify-email). The built-in
//  Supabase auth mailer is NOT used, so no SMTP setup on Supabase needed.
//
//  Deploy:   supabase functions deploy reset-password
//  Secrets:  reuses BREVO_API_KEY, EMAIL_FROM, EMAIL_FROM_NAME, APP_URL
//            (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected)
//  See README.md in this folder for the setup checklist.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const SENDER_EMAIL = Deno.env.get('EMAIL_FROM') ?? ''
const SENDER_NAME = Deno.env.get('EMAIL_FROM_NAME') ?? 'S Link'
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// allow the browser to call this function
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { email } = await req.json().catch(() => ({ email: '' }))
    const addr = String(email || '').trim().toLowerCase()
    // Always answer 200 with the same message — never reveal whether an account exists.
    if (!addr) return json({ ok: true })

    // Generate a recovery link WITHOUT sending Supabase's own email.
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: addr,
      options: { redirectTo: APP_URL || undefined },
    })
    const link = data?.properties?.action_link
    if (error || !link) return json({ ok: true })  // unknown email / error → stay silent

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7B68EE;margin:0 0 10px">S Link</h2>
        <p style="font-size:15px;color:#1f2d3d;margin:0 0 10px">We received a request to reset your password.</p>
        <p style="margin:0 0 18px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#7B68EE;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Reset my password</a></p>
        <p style="font-size:12px;color:#9aa3b2;margin:0">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </div>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: addr }],
        subject: 'Reset your S Link password',
        htmlContent: html,
      }),
    })
    if (!res.ok) return json({ ok: false, error: 'email provider error' }, 502)
    return json({ ok: true })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})
