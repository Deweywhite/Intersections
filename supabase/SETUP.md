# Cloud sync setup (Supabase + Google + email magic link)

Everything in the game already works without this. Until the two keys in
`index.html` are filled in, the sign-in UI stays hidden and stats live in
the browser exactly as before. Do the steps below when you're ready.

Total time: about 30 minutes. Cost: $0 (Supabase free tier, Google OAuth is free).

---

## 1. Create the Supabase project (5 min)

1. Go to https://supabase.com and sign up (GitHub login is easiest).
2. **New project** → name it `intersections`, pick a strong database password
   (you won't need it day-to-day, but save it), choose the region closest to
   most of your players (US East is a good default).
3. Wait ~2 minutes for it to provision.

## 2. Create the tables (2 min)

1. Left sidebar → **SQL Editor** → **New query**.
2. Paste the entire contents of `supabase/schema.sql` and click **Run**.
3. You should see "Success. No rows returned." Sidebar → **Table Editor**
   should now show `player_history` and `player_stats`.

## 3. Get your keys (1 min)

1. Sidebar → **Project Settings** (gear, bottom left) → **General**.
   Your **Project ID** is shown there. Your Project URL is
   `https://<Project ID>.supabase.co` — e.g. `https://myifzzsddeuficvslsgg.supabase.co`.
2. Same settings sidebar → **API Keys**. Copy the one labelled **anon** (some
   dashboards call it **publishable**). *Not* `service_role` / `secret` —
   that one must never go in the browser.
4. In `index.html`, find these two lines near the bottom and paste them in:

   ```js
   window.INTERSECTIONS_SUPABASE_URL = "https://abcdefgh.supabase.co";
   window.INTERSECTIONS_SUPABASE_ANON_KEY = "eyJ...";
   ```

   The anon key is designed to be public. Row Level Security in the schema is
   what stops one player from reading another's data.

## 4. Allow your site to receive sign-ins (2 min)

Supabase only redirects back to URLs you've approved.

1. Sidebar → **Authentication** → **URL Configuration**.
2. **Site URL:** `https://intersectionsgame.com`
3. **Redirect URLs** — add each of these:
   - `https://intersectionsgame.com/**`
   - `https://www.intersectionsgame.com/**`
   - `https://*-anderson-whites-projects.vercel.app/**`  (so Vercel previews work)
   - `http://localhost:*/**`  (optional, for local testing)

## 5. Email magic link (already on — 1 min to check)

1. Sidebar → **Authentication** → **Providers** → **Email**.
2. Make sure **Enable Email provider** is on. Turn **Confirm email** *off*
   (magic links already prove the address). Leave **Secure email change** on.

That's enough to test. Supabase sends the emails itself on the free tier,
but from a generic address and rate-limited to a handful per hour — fine for
you and a few friends, not for launch. See step 7 before going public.

## 6. Google sign-in (10 min)

### In Google Cloud
1. https://console.cloud.google.com → create a project called `Intersections`.
2. **APIs & Services** → **OAuth consent screen**:
   - User type: **External**
   - App name: `Intersections`, support email: yours
   - App domain / homepage: `https://intersectionsgame.com`
   - Privacy policy link: required — see step 8
   - Scopes: leave default (email, profile, openid)
   - Save. It'll say "Testing" — that's fine for now; publish it when you launch.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**:
   - Application type: **Web application**
   - Name: `Intersections web`
   - **Authorized JavaScript origins:** `https://intersectionsgame.com`
   - **Authorized redirect URIs:** `https://<your-project-ref>.supabase.co/auth/v1/callback`
     (Supabase shows this exact URL on its Google provider page — copy it from there.)
   - Create. Copy the **Client ID** and **Client secret**.

### In Supabase
4. Sidebar → **Authentication** → **Providers** → **Google**.
5. Turn it on, paste Client ID and Client secret, **Save**.

## 7. Before launch: send email from your own domain (15 min, optional now)

So magic links come from `@intersectionsgame.com` and don't hit spam:

1. https://resend.com → free account (3,000 emails/month).
2. **Domains** → add `intersectionsgame.com` → add the DNS records it shows
   you at your registrar (same place you set the Vercel A record).
3. **API Keys** → create one.
4. Supabase → **Project Settings** → **Authentication** → **SMTP Settings**:
   - Enable custom SMTP
   - Host `smtp.resend.com`, port `465`, user `resend`, password = the API key
   - Sender email `noreply@intersectionsgame.com`, sender name `Intersections`

## Later: replace the Supabase domain on Google's consent screen

Google's sign-in screen currently says "Sign in to myifzzsddeuficvslsgg.supabase.co"
because Google displays the redirect domain whenever it isn't one you own.
No branding setting changes this. The fix is a custom auth domain, and it's
config only — no code changes.

Cost: Supabase Pro ($25/mo) + Custom Domains add-on ($10/mo). Deferred until
the game justifies it.

When ready:
1. Supabase → **Project Settings** → **Custom Domains** → add `auth.intersectionsgame.com`,
   then add the CNAME it gives you at your DNS registrar and verify.
2. Google Cloud → **Credentials** → your OAuth client → change the redirect
   URI to `https://auth.intersectionsgame.com/auth/v1/callback`.
3. Google Cloud → **OAuth consent screen** → add `intersectionsgame.com` under
   Authorized domains, fill in homepage + privacy policy, and **Publish**.
4. In `index.html`, change `INTERSECTIONS_SUPABASE_URL` to `https://auth.intersectionsgame.com`.

After that Google shows "Sign in to Intersections" with your logo.

## 8. Privacy policy (required by Google, good practice anyway)

Google won't let you publish the OAuth consent screen without a live privacy
policy URL. A short page at `https://intersectionsgame.com/privacy` that says
what you collect (email address, puzzle results), why (sync stats across
devices), and that you don't sell it is enough. Happy to draft one.

---

## How it behaves once configured

- **Stats popup** gains a "Sign in" button. Signed in, it shows the email and
  a sync status line.
- **First sign-in on a device** merges that device's local history into the
  account. Nothing is lost; stats are recomputed from the union.
- **Same day on two devices:** whichever finishes first owns that day.
- **Sign out** leaves the local stats alone.
- **RESET** while signed in asks for confirmation, then clears the account
  and this device.

## If something's wrong

Open the browser console (F12). Sync problems log as `Cloud sync failed:` or
`Cloud push failed:` with the Supabase error. The two usual culprits:
- **"new row violates row-level security"** → step 2 didn't run fully; re-run `schema.sql`.
- **Redirect goes to a Supabase error page** → the URL you're on isn't in step 4's list.
