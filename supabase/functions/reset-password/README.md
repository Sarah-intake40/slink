# Password reset — setup checklist (Brevo)

Sends a "reset your password" email when a user clicks **Forgot password?** on the
login page. Same stack as `notify-email`: a **Supabase Edge Function** that emails
through **Brevo** — so you do **not** need to configure Supabase's built-in auth mailer.

```
"Forgot password?"  →  reset-password Edge Function
   →  admin.generateLink({type:'recovery'})  (no Supabase email sent)
   →  Brevo sends the link  →  user clicks  →  app opens the "set new password" page
   →  supabase.auth.updateUser({ password })  writes the new password
```

## 1. Prerequisite
You already did this for `notify-email`: a Brevo account, a **verified sender**, and a
`BREVO_API_KEY`. The reset function **reuses the same secrets** — nothing new to buy.

## 2. Create the Edge Function
Supabase Dashboard → **Edge Functions** → **Deploy a new function** → *Via Editor* →
name it **`reset-password`** → paste all of `index.ts` from this folder → **Deploy**.

(CLI: `npx supabase functions deploy reset-password`.)

## 3. Secrets (already set if notify-email works)
Edge Functions → **Secrets**. These are shared with `notify-email`:

| Name | Value |
|------|-------|
| `BREVO_API_KEY`   | the `xkeysib-…` key |
| `EMAIL_FROM`      | your **verified sender email** |
| `EMAIL_FROM_NAME` | `S Link` (optional) |
| `APP_URL`         | your site URL, e.g. `http://localhost:5173` (prod: the real URL) |

(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't add them.)

## 4. Allow-list the redirect URL  ⚠️ required
Dashboard → **Authentication → URL Configuration**:
- **Site URL:** your `APP_URL`
- **Redirect URLs:** add your `APP_URL` (e.g. `http://localhost:5173` for local, and the
  deployed URL for prod). The recovery link redirects here; if it isn't allow-listed the
  link is rejected.

## 5. Test
Login page → **Forgot password?** → enter a registered email → email arrives → click
**Reset my password** → you land on the "set new password" page → submit → you're signed in
with the new password.

Debug via **Edge Functions → Logs** and **Brevo → Transactional → Logs**.

### Notes
- The function **always** responds success and never says whether an email is registered
  (prevents account-enumeration / spam abuse).
- The function is called with your project's anon key (a valid JWT), so it passes the
  default `verify_jwt` — no extra config needed.
- Recovery links are single-use and expire (Supabase default ~1 hour).
