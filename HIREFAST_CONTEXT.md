# HireFast — Master Build Context
## Last updated: Truth Engine v2 — Clean Enterprise + 3+2 apply — 19/09/2026

---

## ⚠️ AGENT INSTRUCTIONS — READ FIRST
**At the start of every Cursor session, you MUST read both:**
1. `HIREFAST_CONTEXT.md` (this file)
2. `.cursorrules`

The user may begin with: "Read @HIREFAST_CONTEXT.md and @.cursorrules before we start."  
Always do this. Do not skip or assume prior context.

**Project guides:** Use only `.cursorrules` and `HIREFAST_CONTEXT.md` when the user asks questions. Do not treat other docs (e.g. PHASE2_DEPLOY.md) as authoritative unless the user explicitly references them.

**Project owner:** The project owner is a complete beginner with Cursor and Supabase. When giving instructions (deployment, Supabase Dashboard, terminal, etc.):
- Explain steps in plain language; avoid jargon or assume prior knowledge.
- Break tasks into clear, numbered steps (“click X, then Y”).
- Take the lead: recommend what to do next, suggest the simplest path, and say why.
- If something can be done for them in code, do it; only ask them to do manual steps when necessary (e.g. Dashboard, secrets, domain).

---

## What is HireFast?
HireFast is a high-velocity UK recruitment platform targeting volume hiring 
in logistics, engineering, manufacturing, retail, hospitality, and care sectors. 
The core value proposition is speed and zero friction — 
"The UK's fastest route from applicant to hire."

**The two problems we solve:**
- Drop-off Crisis: 60-80% of candidates abandon traditional job applications on mobile
- Ghosting Crisis: Candidates and recruiters both go silent mid-process

---

## Truth Engine v2 (current — 19/09/2026)

### Clean Enterprise design
- Surfaces: white on `slate-50`. Text: slate-900 / 600 / 500. Brand: `blue-600`.
- `rounded-xl`, `border-slate-200`, `shadow-sm`. No glass / navy hex on primary flows.
- Semantic colours only via `TONE_STYLES` (`src/lib/truth-engine.ts`).
- Logo: Hire slate-900 + Fast blue-600. Favicon: chevron blue-600 on slate-50.

### 3+2 Rule (candidate apply)
1. Public `/jobs` — sticky postcode → Edge Function `resolve-postcode` → `hf_loc` in localStorage (partial + lat/lng only).
2. Apply drawer (Vaul): Full name, Mobile, Postcode. Anonymous `signInAnonymously` if needed. Upsert candidate + insert application (+ `apply_duration_ms`).
3. Success (+2, optional): RTW status, skill chips, optional email → `updateUser` / `signInWithOtp`.
4. `/me/applications` — status, dates (DD/MM/YYYY via `src/lib/format.ts`), withdraw.

### Scoring (must stay in sync)
- Client (job board): `src/lib/truth-engine.ts`
- Server (recruiter list): `public.get_job_applicants(p_job_id)` in `supabase/migrations/20260919000000_truth_engine_v2.sql`
- Constants: 3mi = 100 loc, max commute default 20, road factor 1.3, 25mph, +5 min buffer, engineering/manufacturing 50/50 else 60/40 location/skills, RTW risk cap 25.

### Privacy
- Full postcode **only** inside `resolve-postcode` / `resolve-site-postcode`. Never DB, UI, logs, localStorage.
- Columns: `partial_postcode`, `loc_lat`, `loc_lng` on candidates & jobs.

### Recruiter
- `OrgProvider` — selected `employer_id` on every query.
- Post job ≤ 5 fields; templates in `src/lib/sector-templates.ts`.
- Applicants: RPC only. Dashboard: awaiting reply, public response rate (`get_employer_response_rates`), bulk reject >14d unreviewed.
- Login: magic link, `shouldCreateUser: false`.

### Edge Functions to deploy
- `resolve-postcode`, `resolve-site-postcode` (plus existing ratings-trigger, bulk-reengagement, status-feed-sms, job-match-notify).

### TODO — anonymous → existing account merge
When a candidate upgrades email and the address already belongs to another auth user, we currently send `signInWithOtp` and show “Check your inbox”. We do **not** yet merge applications from the anonymous `user_id` into the existing account. Implement a secure merge (service-role Edge Function) later.

### Migration
- `supabase/migrations/20260919000000_truth_engine_v2.sql` — Tom must run in SQL editor / `supabase db push`.
- Enable Anonymous sign-ins in Supabase Auth.
- After verifying partial_postcode backfill, run commented legacy `postcode = null` clean-up.

### Primary routes
| Path | Purpose |
|------|---------|
| `/jobs` | Public job board + apply |
| `/me/applications` | Candidate applications |
| `/me` | Optional profile hub |
| `/recruiter` | Dashboard + ghosting controls |
| `/recruiter/post-job` | ≤5 field post |
| `/recruiter/jobs/:id` | Server-scored applicants |
| `/privacy`, `/terms` | Placeholders (legal review TODO) |

See also `AUDIT.md` for the Phase 1 audit and manual steps for Tom.

---

## Tech Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS v4 (@tailwindcss/vite plugin — NO tailwind.config.js ever)
- Backend: Supabase (PostgreSQL + Magic Link Auth + Anonymous sessions — NO passwords ever)
- Routing: React Router DOM v6 (recruiter pages lazy-loaded)
- Icons: lucide-react only
- Utilities: clsx + tailwind-merge (`cn()` at src/lib/utils.ts)
- Components: Shadcn/UI + Vaul Drawer
- Animation: Framer Motion
- Fonts: DM Sans (Google Fonts in index.html)
- Tests: Vitest (`npm test`) — `src/lib/truth-engine.test.ts`
- Hosting: Vercel (frontend) + Supabase (backend)

---

## Legacy notes
Older Session 3–7 pages (ManageApplicants sheet, dark JobBoard, ratings) may still use navy tokens. Primary product paths above are Clean Enterprise. Prefer editing those when changing UX.

## Deployment
**Live:** https://www.hirefast.uk  
See `DEPLOYMENT.md`, `.env.example`, `AUDIT.md` § Manual steps for Tom.
