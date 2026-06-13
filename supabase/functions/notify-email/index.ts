// ============================================================
//  S Link — Edge Function: email notifications (via Brevo)
//  Triggered by a Database Webhook on INSERT into `notifications`.
//  Looks up the recipient's email + the actor's name, then sends an
//  email through Brevo (https://www.brevo.com) — free tier 300/day,
//  and NO custom domain required (just a verified sender email).
//  Runs on Supabase Edge Functions (Deno) — free tier 500K calls/month.
//
//  Deploy:   supabase functions deploy notify-email
//  Secrets:  BREVO_API_KEY, EMAIL_FROM (your verified sender email),
//            EMAIL_FROM_NAME (optional), APP_URL, NOTIFY_TYPES (optional)
//  See README.md in this folder for the full setup checklist.
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') ?? ''
const SENDER_EMAIL = Deno.env.get('EMAIL_FROM') ?? ''           // a sender verified in Brevo (e.g. your Gmail)
const SENDER_NAME = Deno.env.get('EMAIL_FROM_NAME') ?? 'S Link'
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
// which notification types should trigger an email (comma list)
const NOTIFY_TYPES = (Deno.env.get('NOTIFY_TYPES') ?? 'assigned,mention,comment').split(',').map((s) => s.trim())

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

function subjectFor(type: string, actor: string): string {
  if (type === 'assigned') return `${actor} assigned you a task`
  if (type === 'mention') return `${actor} mentioned you`
  if (type === 'comment') return `${actor} left a comment`
  return 'New notification in S Link'
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const n = payload?.record ?? payload   // DB webhook sends { record }, allow direct calls too
    if (!n?.user_id || !NOTIFY_TYPES.includes(n.type)) {
      return new Response('skipped', { status: 200 })
    }

    const { data: recip } = await supabase.from('profiles').select('email, full_name').eq('id', n.user_id).single()
    if (!recip?.email) return new Response('no recipient email', { status: 200 })

    let actorName = 'Someone'
    if (n.actor_id) {
      const { data: actor } = await supabase.from('profiles').select('full_name').eq('id', n.actor_id).single()
      if (actor?.full_name) actorName = actor.full_name
    }

    const subject = subjectFor(n.type, actorName)
    const link = n.list_id && APP_URL ? `${APP_URL}/list/${n.list_id}` : (APP_URL || '#')
    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#7B68EE;margin:0 0 10px">S Link</h2>
        <p style="font-size:15px;color:#1f2d3d;margin:0 0 10px">${escapeHtml(subject)}.</p>
        ${n.body ? `<p style="font-size:14px;color:#3a4456;background:#f4f5f7;padding:11px 13px;border-radius:8px;margin:0 0 14px">${escapeHtml(String(n.body))}</p>` : ''}
        <p style="margin:0 0 18px"><a href="${link}" style="display:inline-block;background:#7B68EE;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">Open in S Link</a></p>
        <p style="font-size:12px;color:#9aa3b2;margin:0">You're receiving this because you're a member of the workspace.</p>
      </div>`

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: recip.email, name: recip.full_name ?? undefined }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) return new Response('email provider error: ' + (await res.text()), { status: 502 })
    return new Response('sent', { status: 200 })
  } catch (e) {
    return new Response('error: ' + (e as Error).message, { status: 500 })
  }
})
