# HireFast — Master Build Context
## Last updated: Session 3 complete + live on hirefast.uk — 01/03/2026

---

## ⚠️ AGENT INSTRUCTIONS — READ FIRST
**At the start of every Cursor session, you MUST read both:**
1. `HIREFAST_CONTEXT.md` (this file)
2. `.cursorrules`

The user may begin with: "Read @HIREFAST_CONTEXT.md and @.cursorrules before we start."  
Always do this. Do not skip or assume prior context.

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

## Tech Stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS v4 (@tailwindcss/vite plugin — NO tailwind.config.js ever)
- Backend: Supabase (PostgreSQL + Magic Link Auth — NO passwords ever)
- Routing: React Router DOM v6
- Icons: lucide-react only (no other icon libraries)
- Utilities: clsx + tailwind-merge (cn() at src/lib/utils.ts)
- Components: Shadcn/UI (already installed — Table, Badge, Tooltip, Sheet, 
  Tabs, Button, Input, Select, Card, DropdownMenu)
- Tables: @tanstack/react-table (already installed)
- Animation: Framer Motion (already installed)
- Fonts: DM Sans + DM Mono (loaded via Google Fonts in index.html) ✅
- Hosting: Vercel (frontend) + Supabase (backend)

---

## Brand & Design Tokens v2.0
⚠️ ALL new components must use v2.0 tokens. Old tokens are deprecated.

### Deprecated (do not use)
- ~~#0f1624~~ → use #090d16
- ~~#141f33~~ → use #0f1522
- ~~#2a3a5c~~ → use #1f2d47
- ~~#6b7fa3~~ → use #8494b4

### Current Tokens
- Font UI: DM Sans (weights: 300, 400, 500, 600, 700)
- Font Mono: DM Mono (weights: 400, 500) — ALL numeric data, postcodes, pay rates, match %
- Background: #090d16 — solid only, NO dot grids or patterns ever
- Surface: #0f1522 (cards, table backgrounds)
- Surface-2: #141d2e (input backgrounds, hover states)
- Surface-3: #1a2438 (nested/subtle elements, skeleton loaders)
- Active/pressed: #243352
- Border: #1f2d47 (all 1px borders)
- Border-2: #243352 (focus rings, active borders)
- Primary: #3b6ef5 (electric blue — primary actions, links)
- Primary hover: #4d7ef6
- Primary active: #2d5ae0
- Text-1: #f0f4ff (headings, important values)
- Text-2: #8494b4 (metadata, labels — never pure white)
- Text-3: #4d5f7a (placeholders, tertiary info)
- Wordmark: "Hire" in #f0f4ff + "Fast" in #3b6ef5, font-bold tracking-tight

### Border Radius
- Cards and table wrappers: rounded-[14px]
- Inputs and buttons: rounded-[10px]
- Nav items and tab triggers: rounded-[8px]
- Status badges: rounded-[6px]
- Commute pills and sector chips: rounded-full

### Card Styles
- All pages: bg-[#0f1522] border border-[#1f2d47] rounded-[14px]
- Stat cards: add top-edge glow inside card:
  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
- Glass effect: candidate landing hero ONLY
  bg-white/[0.03] backdrop-blur-sm border border-white/[0.07]
- NO glassmorphism anywhere else in the app

### Input Style
- bg-[#141d2e] border border-[#1f2d47] rounded-[10px]
- focus:border-[#3b6ef5] focus:ring-1 focus:ring-[#3b6ef5]
- placeholder:text-[#4d5f7a]

### Button — Primary
- bg-[#3b6ef5] hover:bg-[#4d7ef6] rounded-[10px] font-semibold
- active:scale-[0.98] transition

### Button — Secondary
- border border-[#1f2d47] bg-[#0f1522] text-[#8494b4] rounded-[10px]
- hover:border-[#3b6ef5] hover:text-[#3b6ef5]

### Navigation
- Header: bg-[#090d16]/90 backdrop-blur-xl border-b border-[#1f2d47]
- Active link: text-[#3b6ef5] rounded-[8px]
- Inactive link: text-[#8494b4] hover:text-white rounded-[8px]

### Tabs
- TabsList: bg-[#090d16] border border-[#1f2d47] rounded-[10px] p-1
- TabsTrigger inactive: text-[#8494b4] rounded-[8px]
- TabsTrigger active: bg-[#3b6ef5] text-white rounded-[8px]

### Badges
- Shortlisted: border-[#3b6ef5]/25 bg-[#3b6ef5]/10 text-[#3b6ef5] rounded-[6px]
- Pending: border-[#1f2d47] bg-[#1a2438] text-[#8494b4] rounded-[6px]
- Rejected: border-rose-500/25 bg-rose-500/10 text-rose-400 rounded-[6px]

### Skeleton Loaders
- ALWAYS on async Supabase fetches — never blank state
- bg-[#0f1522] border border-[#1f2d47] rounded-[14px] overflow-hidden relative
- Shimmer animation:
  <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
- Keyframe in App.css: @keyframes shimmer { 100% { transform: translateX(200%); } }

---

## Truth Engine — Semantic Colours
RESERVED for match/risk indicators ONLY. Never use decoratively.
- Emerald: safe commute, RTW confirmed, high match, success
  bg-emerald-500/10 text-emerald-400 border border-emerald-500/25
- Amber: medium commute, pending verification, caution
  bg-amber-500/10 text-amber-400 border border-amber-500/25
- Rose: high risk, rejected, error
  bg-rose-500/10 text-rose-400 border border-rose-500/25

---

## Sector Colours (consistent across all pages)
- Logistics/Warehousing: blue-500 family, Truck icon
- Engineering/Manufacturing: violet-500 family, Wrench icon
- Retail: pink-500 family, ShoppingBag icon
- Care: emerald-500 family, Heart icon
- Driving: amber-500 family, Car icon
- Hospitality: orange-500 family, UtensilsCrossed icon

---

## Project Location
C:\Users\tomfo\Documents\HireFast\hirefast-v2\hirefast-v2

---

## Supabase Schema (cleaned and current)

### candidates
- id uuid PK
- user_id uuid (references auth.users)
- email text
- full_name text
- phone text
- postcode text (full — never expose in UI)
- candidate_skills text[]
- has_rtw boolean
- rtw_verified boolean
- ni_confirmed boolean
- dbs_status text
- availability text[]
- has_vehicle boolean
- transport_mode text
- cv_url text
- cv_text text
- profile_token text
- speed_summary text
- created_at timestamptz
- updated_at timestamptz

### jobs
- id uuid PK
- employer_id uuid (FK → employers.id)
- recruiter_id uuid
- title text
- location_name text
- postcode text
- sector text
- pay_rate text
- description text
- shift_patterns text[]
- commute_threshold_mins integer (default 45)
- required_skills text[]
- auto_reject_low_matches boolean
- immediate_start boolean
- is_active boolean
- status text
- closed_at timestamptz (set when deactivated; 48hrs later triggers ratings email)
- ratings_trigger_sent_at timestamptz
- created_at timestamptz

### applications
- id uuid PK
- job_id uuid (FK → jobs.id)
- employer_id uuid (FK → employers.id)
- candidate_id uuid (FK → candidates.id)
- full_name text
- email text
- phone text
- candidate_postcode text (full — never expose in UI)
- commute_distance_miles double precision
- commute_risk_level text ('low' | 'medium' | 'high')
- journey_time_mins integer
- match_score integer
- status text (default: 'pending')
- outcome text
- has_rtw boolean
- has_certs boolean
- candidate_skills text[]
- interest_status text (default: 'none')
- interest_check_token text
- interest_check_sent_at timestamptz
- interest_confirmed_at timestamptz
- last_contacted_at timestamptz
- shortlisted_at timestamptz
- reason text
- created_at timestamptz

### employers
- id uuid PK
- company_name text
- admin_email text
- industry_sector text
- location text
- website text
- company_description text
- created_by uuid
- created_at timestamptz

### recruiter_employers
- user_id uuid
- employer_id uuid (FK → employers.id)

### ratings
- id uuid PK
- job_id uuid (FK → jobs.id)
- recruiter_id uuid
- candidate_id uuid
- rated_by text ('recruiter' or 'candidate')
- score integer (1-5)
- comment text
- created_at timestamptz

### application_events
- id uuid PK
- application_id uuid (FK → applications.id)
- event_type text
- message text
- sms_sent_at timestamptz (when status-feed-sms sent notification)
- created_at timestamptz

---

## Shift & Availability Array Format
Both job.shift_patterns and candidate.availability use plain English strings.
Standard values:
'Early (6am-2pm)', 'Late (2pm-10pm)', 'Nights (10pm-6am)',
'Days (7am-7pm)', 'Nights (7pm-7am)', '4-on 4-off',
'Mornings', 'Afternoons', 'Weekends', 'Flexible'
Matching is case-insensitive exact string comparison.

---

## RLS Policies (current)
- applications:
  Candidates INSERT (WITH CHECK job is_active = true)
  Candidates SELECT own (candidate_id → candidates.user_id = auth.uid())
  Recruiters ALL (scoped to jobs where recruiter_id = auth.uid())
- candidates:
  Anyone INSERT (with_check: true)
  Candidates SELECT/UPDATE own (user_id = auth.uid())
- employers: Recruiters ALL (scoped to created_by)
- jobs: Recruiters ALL (scoped to recruiter_id)
- recruiter_employers: Users SELECT own, Service role ALL
- ratings:
  Candidates SELECT/INSERT own (candidate_id → candidates.id where candidates.user_id = auth.uid(); INSERT only with rated_by = 'candidate')
  Recruiters SELECT/INSERT (recruiter_id = auth.uid(); INSERT only with rated_by = 'recruiter')

---

## Key Architecture Decisions

### Auth & Registration Flow
- Magic Links only. No passwords. Ever.
- Registration flow:
  1. Register page collects name/email/postcode
  2. Stores in localStorage as 'hirefast_pending_candidate'
  3. Calls supabase.auth.signInWithOtp({ email })
  4. Does NOT insert into candidates table yet
  5. MagicLinkHandler fires after magic link click:
     - Gets session
     - Checks recruiter_employers for this user_id
     - If recruiter found → /recruiter/applicants
     - If not recruiter: checks if candidates row exists
       - No row → reads localStorage, INSERTs candidate,
         clears localStorage → /candidate/verify
       - Row exists → /candidate/jobs
- Skeleton shown throughout MagicLinkHandler — never blank screen

### Layout
- RecruiterLayout.tsx wraps all recruiter pages
  src/layouts/RecruiterLayout.tsx — max-w-5xl canvas
- CandidateLayout.tsx wraps all candidate pages
  src/layouts/CandidateLayout.tsx
- Header: bg-[#090d16]/90 backdrop-blur-xl border-b border-[#1f2d47]

### Commute Scoring
- Postcodes.io (free, no API key required)
- Postcode MUST be stripped of spaces before API call:
  postcode.replace(/\s+/g, '')
- Haversine distance formula
- Journey time estimated by transport mode:
  car=25mph, public=15mph, cycle=10mph, walk=3mph
- Risk levels: low (≤threshold), medium (≤1.25×), high (>1.25×)
- Utility: src/lib/commuteScoring.ts
- Add 200ms delay between calls to avoid rate limiting
- Fires async AFTER application INSERT — never blocks success screen
- Stored in applications: commute_distance_miles, journey_time_mins,
  commute_risk_level

### Match Scoring
- With shift data: 40% location + 30% skills + 30% shifts (matchLogic.getMatchBreakdown, includeShiftMatch: true)
- Without shift data: 50% location + 50% skills
- Location score: low=100, medium=60, high=20
- Skills score: matched skills / required skills × 100. No required skills = 100
- Shift score: calculateShiftMatch() in matchLogic.ts — wired in JobBoard apply scoring and commuteScoring backfill

### Match Score Ring (MatchScoreRing.tsx)
- SVG donut: r=16, strokeWidth=3.5, circumference=100.53
- Emerald ≥80, Amber 60-79, Rose <60
- Track colour: #1a2438
- Props: { score: number | null, size?: 'sm' | 'default' }

### Applicant list (Recruiter side) — Realtime
- ManageApplicants subscribes to Supabase Realtime INSERTs on `applications` (filter: employer_id).
- New applications appear without refresh. Requires `applications` in Realtime publication:
  `ALTER PUBLICATION supabase_realtime ADD TABLE applications;`

### Candidate Sheet (Recruiter side)
- Clicking a row in ManageApplicants opens Shadcn Sheet
  side="right", max-w-2xl
- Never navigate away from the applicants list
- Tabs: Overview / Skills / History
- Optimistic UI on shortlist/reject — rollback on error

### Apply Flow (Candidate side)
- Bottom sheet (Vaul/Shadcn Sheet) — never a centred modal
- Pre-fills name, phone, postcode from candidate profile
- Postcode field: candidate enters **full** UK postcode (e.g. S35 2YF), maxLength 8; full value stored for commute scoring
- RTW status shown as emerald badge "(Self-declared)"
- On submit: INSERT applications, then async score commute
- On 409 conflict: treat as success (already applied)
- Success screen: CheckCircle animation + "Application Sent!"

### Postcode Privacy
- Recruiter-facing UI: never display full postcode — show outward code only (e.g. postcode.trim().split(' ')[0])
- Apply form: candidate inputs full postcode; full stored in DB for scoring only

### Self-Declared Data
- RTW, NI, DBS always labelled "(Self-declared)"
- Never imply these are verified

### Database Constraints
- applications has UNIQUE constraint on (job_id, email)
- applications.candidate_id FK → candidates.id (not auth.users)

---

## Components Built
- src/layouts/RecruiterLayout.tsx              ✅ v2.0
- src/layouts/CandidateLayout.tsx              ✅ v2.0
- src/components/recruiter/MatchScoreRing.tsx  ✅ v2.0
- src/components/recruiter/ApplicantsTable.tsx ✅ v2.0
- src/components/recruiter/CandidateSheet.tsx  ✅ v2.0
- src/lib/commuteScoring.ts
  Exports: calculateCommuteScore(), backfillCommuteScores()
- src/lib/matchLogic.ts
  Exports: calculateShiftMatch(), getMatchBreakdown()
- src/lib/rtwBadge.ts
  Exports: getRtwScore(), getRtwBadgeLabel(), getRtwBadgeClass() — 0-4 progressive verification
- src/types/index.ts
  Exports: Candidate, Job, Application, Employer,
  Rating, ApplicationEvent interfaces

---

## Page Structure & Routes

### Public
| Page | File | Route | Status |
|------|------|--------|--------|
| Candidate Landing | src/pages/public/CandidateLanding.tsx | / | ✅ Built |
| Recruiter Landing | src/pages/public/RecruiterLanding.tsx | /recruiters | ✅ Built |
| Waitlist Confirmation | src/pages/shared/WaitlistConfirmation.tsx | /waitlist-confirmation | ✅ Built |

### Candidate Flow
| Page | File | Route | Status |
|------|------|--------|--------|
| Register | src/pages/candidate/Register.tsx | /candidate/register | ✅ v2.0 |
| Verify Identity | src/pages/candidate/VerifyIdentity.tsx | /candidate/verify | ✅ v2.0 |
| Shift Preferences | src/pages/candidate/ShiftPreferences.tsx | /candidate/shifts | ✅ v2.0 |
| Profile Complete | src/pages/candidate/ProfileComplete.tsx | /candidate/profile-complete | ✅ v2.0 |
| Job Board | src/pages/candidate/JobBoard.tsx | /candidate/jobs | ✅ v2.0 |
| Applications History | src/pages/candidate/Applications.tsx | /candidate/applications | ✅ v2.0 |
| Feedback (Ratings) | src/pages/candidate/Ratings.tsx | /candidate/ratings | ✅ v2.0 |

### Recruiter Flow
| Page | File | Route | Status |
|------|------|--------|--------|
| Login | src/pages/recruiter/Login.tsx | /recruiter/login | ✅ v2.0 |
| Post Job | src/pages/recruiter/PostJob.tsx | /recruiter/post-job | ✅ v2.0 |
| Manage Applicants | src/pages/recruiter/ManageApplicants.tsx | /recruiter/applicants | ✅ v2.0 |
| Candidate Profile | src/pages/recruiter/CandidateProfile.tsx | /recruiter/candidate/:id | ✅ v2.0 |
| Ratings | src/pages/recruiter/Ratings.tsx | /recruiter/ratings | ✅ v2.0 |

### Shared
| Page | File | Route | Status |
|------|------|--------|--------|
| Magic Link Handler | src/pages/shared/MagicLinkHandler.tsx | /auth/callback | ✅ Built |
| Not Found | src/pages/shared/NotFound.tsx | * | ✅ Built |
| Settings | src/pages/shared/Settings.tsx | /settings | ✅ v2.0 |

---

## UI & Coding Rules — ALWAYS FOLLOW THESE

1. TypeScript only — no .jsx or .js files
2. Tailwind v4 only — no tailwind.config.js, no inline styles
3. Mobile-first — design for 390px first, scale up
4. Thumb-friendly — 44px min tap targets, no hover-only interactions
5. UK standards — £, miles, UK postcodes, DD/MM/YYYY, British English
6. No passwords ever — Magic Link auth only
7. Supabase client — always import from src/lib/supabase.ts
8. Icons — lucide-react only, no other icon libraries
9. Friction is the enemy — max 5 fields recruiters, max 3 fields candidates
10. RLS always — every query scoped to correct user
11. GDPR — consent language wherever data is collected
12. Self-declared — RTW, NI, DBS always labelled clearly
13. No CV required — entry-level roles apply without CV
14. Progress bars — all candidate onboarding shows Step X of 4
15. Skeleton loaders — all async fetches show skeletons, never blank
16. Optimistic UI — status updates apply locally first, rollback on error
17. Sheet not navigate — candidate review opens in Shadcn Sheet
18. Never show full postcode — outward code only
19. No nested ternaries in JSX — extract into named functions
20. No IIFEs in JSX — extract into named render functions
21. Typography hierarchy:
    - Headings/titles: text-[#f0f4ff] font-semibold tracking-tight
    - Metadata/labels: text-[#8494b4]
    - Data values: text-[#f0f4ff] tabular-nums font-mono
22. Truth Engine colours semantic only — never decorative
23. Postcode API: strip spaces before sending
    postcode.replace(/\s+/g, '')
24. Apply button always fully visible — never fade on hover
25. Bottom sheet for apply — never a centred modal on mobile
26. Design tokens — always v2.0, never old tokens

---

## Current Status
- Phase 1: ✅ COMPLETE — full end-to-end flow working 28/02/2026
- Session 1: ✅ COMPLETE — design system v2.0 established
- Session 2: ✅ COMPLETE — all pages upgraded to v2.0 tokens
- Session 3: ✅ Complete — Radix a11y, Applications page, shift match, RTW badge, Login/Settings/CandidateProfile v2.0, deployment live
- **Live:** https://www.hirefast.uk (Vercel + Supabase)
- Realtime: applications table in supabase_realtime; recruiter Applicants list auto-updates on new application
- Post Job: pay rate field defaults to £. Apply form: full UK postcode input (e.g. S35 2YF). Applicants empty-state "Post a Job" button: primary blue (v2.0)

---

## Session 3 — Completed
1. ~~Fix Radix DialogTitle accessibility warning on apply sheet~~ ✅
2. ~~Wire calculateShiftMatch() into match scoring~~ ✅
3. ~~Candidate applications history page (/candidate/applications)~~ ✅
4. ~~Ready to Work Badge — progressive verification (0-4 score)~~ ✅ (src/lib/rtwBadge.ts)
5. ~~CandidateProfile.tsx — upgrade to v2.0 tokens~~ ✅
6. ~~Login.tsx — upgrade to v2.0 tokens~~ ✅
7. ~~Settings.tsx — upgrade to v2.0 tokens~~ ✅
8. ~~Deploy to Vercel + hirefast.uk domain~~ ✅ Live at www.hirefast.uk

---

## Deployment (Vercel + hirefast.uk) — ✅ LIVE
**Status:** Live at https://www.hirefast.uk. Frontend on Vercel, backend on Supabase.

**Instructions must be simplified:** The project owner needs deployment steps that are beginner-friendly, step-by-step, and free of jargon. Break everything into numbered steps with screenshots or clear "click this, then that" guidance. Avoid assumptions about prior DevOps or CLI experience. When documenting deployment, write for someone who has not done this before.

- **DEPLOYMENT.md** — Full step-by-step guide (GitHub → Vercel → Supabase → custom domain)
- **vercel.json** — SPA routing (all routes serve index.html)
- **.env.example** — Template for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

---

## Phase 2 Features
1. ~~Candidate ratings page~~ — rate recruiters after hire/rejection ✅ (src/pages/candidate/Ratings.tsx, /candidate/ratings)
2. ~~Two-Way Ratings trigger~~ — Edge Function `ratings-trigger` runs daily; 48hrs after job closes sends magic links to candidates ✅
3. ~~Bulk Re-Engagement~~ — Edge Function `bulk-reengagement` runs daily; sends magic links to dormant pending applicants (7+ days) ✅
4. ~~WhatsApp-Style Status Feed~~ — Edge Function `status-feed-sms` runs every 15min; sends SMS via Twilio for shortlisted/rejected/interest events ✅

Deploy: see `supabase/PHASE2_DEPLOY.md`. Schema: `supabase/phase2_schema.sql`. Cron: `supabase/phase2_cron.sql`.