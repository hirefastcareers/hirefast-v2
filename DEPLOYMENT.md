# HireFast — Deployment Guide

**Beginner-friendly, step-by-step.** Each step tells you exactly what to click and where to go.

---

## Before you start

You will need:

- A **GitHub** account (free)
- A **Vercel** account (free) — sign up at [vercel.com](https://vercel.com)
- A **Supabase** project (you should already have this if the app works locally)
- The **hirefast.uk** domain (or another domain you own)

---

## Step 1: Put your code on GitHub

If your project is not on GitHub yet:

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon (top right) → **New repository**
3. Name it something like `hirefast` or `hirefast-v2`
4. Leave it **empty** (no README, no .gitignore) — we have those already
5. Click **Create repository**
6. Open a terminal in your project folder and run:

   ```text
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   git push -u origin main
   ```

   Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your GitHub username and repo name.

---

## Step 2: Get your Supabase credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Open your **HireFast** project (the one you use for local development)
3. Click **Settings** (gear icon in the left sidebar)
4. Click **API** in the menu
5. Copy these two values (keep this tab open):
   - **Project URL** — this is your `VITE_SUPABASE_URL`
   - **anon public** key (under "Project API keys") — this is your `VITE_SUPABASE_ANON_KEY`

---

## Step 3: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use **Continue with GitHub**)
2. Click **Add New…** → **Project**
3. **Import** your HireFast repository (e.g. `hirefast-v2`)
4. Vercel will auto-detect it as a Vite project — leave the default settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (or `pnpm run build` if you use pnpm)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Before deploying, open **Environment Variables** and add these two (Key + Value):

   | Key                     | Value                                  |
   |-------------------------|----------------------------------------|
   | `VITE_SUPABASE_URL`     | Paste your Supabase Project URL        |
   | `VITE_SUPABASE_ANON_KEY`| Paste your Supabase anon public key    |

   On this screen you may only see Key and Value — that’s fine. Add both, then deploy. (If you later want to limit a variable to Production only, go to **Project** → **Settings** → **Environment Variables** and edit it there; you’ll see Production / Preview / Development checkboxes.)
6. Click **Deploy**
7. Wait 1–2 minutes. When it finishes, you'll see a green **Visit** button
8. Click **Visit** — your app should be live (e.g. `hirefast-v2.vercel.app`)

---

## Step 4: Configure Supabase for your live URL

Supabase needs to know your live site URL so magic links work.

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add your Vercel URL, for example:
   - `https://your-project.vercel.app`
   - `https://your-project.vercel.app/auth/callback`
3. Under **Site URL**, set: `https://your-project.vercel.app` (or your custom domain later)
4. Click **Save**

---

## Step 5: Add your custom domain (hirefast.uk)

1. In your Vercel project, go to **Settings** → **Domains**
2. Type `hirefast.uk` (or `www.hirefast.uk` if you prefer)
3. Click **Add**
4. Vercel will show you DNS records to add
5. Log in to your domain registrar (where you bought hirefast.uk, e.g. GoDaddy, Namecheap, 123-reg)
6. Add the records Vercel shows you — usually:
   - **A record:** `76.76.21.21` (or the IP Vercel gives)
   - **CNAME record:** `www` → `cname.vercel-dns.com` (if using www)
7. Wait 5–60 minutes for DNS to update
8. Vercel will show **Valid** when it's ready
9. Update Supabase **Redirect URLs** and **Site URL** to `https://hirefast.uk` and `https://hirefast.uk/auth/callback`

---

## Troubleshooting

### "Application failed to load" or blank screen

- Check the browser console (F12 → Console) for errors
- In Vercel, go to **Deployments** → click the latest → **Building** tab to see any build errors
- Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly and spelt exactly like that

### Magic links don't work

- In Supabase, make sure your live URL (and `/auth/callback`) is in **Redirect URLs**
- Check that **Site URL** matches your live domain

### Changes not showing after a new deploy

- Make sure you pushed your latest code to GitHub
- Vercel deploys automatically on every push to `main`
- In Vercel, click **Deployments** to see if a new deployment ran

### Need to redeploy manually

- In Vercel project → **Deployments** → three dots (⋯) next to a deployment → **Redeploy**

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Put code on GitHub |
| 2 | Copy Supabase URL and anon key |
| 3 | Import repo in Vercel, add env vars, deploy |
| 4 | Add your Vercel URL to Supabase Redirect URLs |
| 5 | Add hirefast.uk in Vercel Domains, update DNS, update Supabase URLs |

You're done. Your app should be live at hirefast.uk.
