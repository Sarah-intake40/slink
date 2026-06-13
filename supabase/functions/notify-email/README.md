# Email notifications — setup checklist (Brevo)

Sends an email when a row is inserted into `notifications` (assignments, comments,
mentions). Runs on **Supabase Edge Functions** (free: 500K calls/month) and sends
through **Brevo** (free: 300 emails/day) — **no custom domain needed**, just a
verified sender email.

```
notification inserted  →  DB Webhook  →  notify-email Edge Function  →  Brevo  →  inbox
```

## 1. Brevo account + verified sender (free)
1. Sign up at https://www.brevo.com (free). Fill in the account details it asks for
   (this also activates transactional sending).
2. Verify a **sender**: top-right menu → **Senders, Domains & Dedicated IPs** →
   **Senders** tab → **Add a sender** → enter a name (e.g. `S Link`) and an email you
   can open (your Gmail/Outlook). Brevo emails that address a confirmation link → click it.
3. Get an API key: **SMTP & API** → **API Keys** → **Generate a new API key** → copy it
   (starts with `xkeysib-`).

## 2. Create the Edge Function
Easiest: Supabase Dashboard → **Edge Functions** → **Deploy a new function** → *Via Editor*
→ name it **`notify-email`** → paste all of `index.ts` from this folder → **Deploy**.

(CLI alternative: `npm install supabase --save-dev`, `npx supabase login`,
`npx supabase link --project-ref <ref>`, `npx supabase functions deploy notify-email`.)

## 3. Set the function secrets
Edge Functions → **Secrets** (Manage secrets) → add:

| Name | Value |
|------|-------|
| `BREVO_API_KEY`   | the `xkeysib-…` key |
| `EMAIL_FROM`      | the **verified sender email** (e.g. `you@gmail.com`) |
| `EMAIL_FROM_NAME` | `S Link` (optional) |
| `APP_URL`         | `http://localhost:5173` (your real site URL in prod) |
| `NOTIFY_TYPES`    | `assigned,mention` (optional — limits which events email) |

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't add them.)

## 4. Create the Database Webhook
Dashboard → **Database → Webhooks → Create a new hook**:
- **Table:** `notifications`  ·  **Events:** `Insert`
- **Type:** *Supabase Edge Function* → **notify-email**  ·  Method `POST`

## 5. Test
Assign a task to a teammate whose `profiles.email` is set → email arrives in a few seconds.
Debug via **Edge Functions → Logs** (`sent` / `skipped` / `no recipient email` / error) and
**Brevo → Transactional → Logs**.

### Notes
- Brevo's `EMAIL_FROM` **must** be a sender you verified in step 1, or sends fail.
- Sending "from" a `@gmail.com` works but can be spam-filtered (Gmail DMARC). Fine for
  internal/testing; for best delivery, verify a real domain later and send from it.
- The function never blocks task creation — if email fails it just logs an error.
