# Phase 2 Edge Functions — step‑by‑step guide (email‑only)

This page assumes **no Supabase experience**.  
Follow it in order and you’ll be fine.

You have **two email flows**:
- `ratings-trigger` → emails candidates 48 hours after a job is closed and asks them to rate the recruiter.
- `bulk-reengagement` → emails dormant candidates and asks “are you still interested?”.

There is also an SMS function in the repo (`status-feed-sms`), but this guide **ignores it**.  
You can wire it up later if you decide to use Twilio or WhatsApp for messaging.

---

## 1. Deploy the functions

You can do this once and then forget about it.

### 1.1 Using the Supabase CLI (recommended)

1. Open a terminal in your HireFast project folder (same folder as `supabase/`).
2. Link your local project to your Supabase project (you only do this once per machine):

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

3. Deploy the two email functions:

```bash
supabase functions deploy ratings-trigger
supabase functions deploy bulk-reengagement
```

That’s it — they are now available at:
- `/functions/v1/ratings-trigger`
- `/functions/v1/bulk-reengagement`

---

## 2. Add secrets (environment variables)

These are just key → value pairs that the functions read at runtime.

### 2.1 App URL (required)

1. In Supabase Dashboard, go to **Edge Functions → Secrets**.
2. Add:

- **Name:** `HIREFAST_APP_URL`  
  **Value:** `https://www.hirefast.uk`

This tells Supabase where to send candidates when they click email magic links.

You **do not** need to set `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`. Supabase injects those automatically.

---

## 3. Schedule the jobs with pg_cron (optional but recommended)

Without this step, the functions only run if you **manually call** them.  
With cron, they run automatically on a schedule.

All of this is done inside **Supabase Dashboard → SQL Editor**.

### 3.1 Turn on required extensions (run once)

Paste and run:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 3.2 Save your project URL and key in Vault (run once)

You need your:
- Project ref (looks like `abcdxxxx.supabase.co` – use the part before `.supabase.co`).
- **Service role key** (Settings → API in Supabase Dashboard).

Replace both placeholders and then run:

```sql
SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
```

You only do this once per project.

### 3.3 Create the schedules

Paste this entire block and run it:

```sql
-- Ratings trigger: daily at 10:00 UTC
SELECT cron.schedule(
  'hirefast-ratings-trigger',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/ratings-trigger',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Bulk re-engagement: daily at 09:00 UTC
SELECT cron.schedule(
  'hirefast-bulk-reengagement',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/bulk-reengagement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### 3.4 Turning schedules off (if needed)

To stop any of these jobs running in future:

```sql
SELECT cron.unschedule('hirefast-ratings-trigger');
SELECT cron.unschedule('hirefast-bulk-reengagement');
```


