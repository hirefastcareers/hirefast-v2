# HireFast — Truth Engine v2 Audit

**Date:** 19/09/2026  
**Branch:** `cursor/truth-engine-v2-7308`  
**Spec:** Cloud Agent Build Prompt v2 (Speed-First + Truth Engine)

---

## 1. Build / type / lint (Phase 1)

| Check | Result |
|-------|--------|
| `npm install` | Pass |
| `npm run build` | Pass (chunk size warning ~945 kB — addressed in Phase 7 via recruiter code-splitting) |
| `npx tsc --noEmit` | Pass |
| `npm run lint` | Pass after Phase 1 fixes (prefer-const, unused vars, PostJob sector template without sync effect, eslint rule tuning for Shadcn + data-fetch effects) |

### Lint fixes applied
- `JobBoard.tsx`: `let list` → `const list`
- `PostJob.tsx`: sector template applied in click handler, not `useEffect`
- `Ratings.tsx`: removed unused `_employerId` / `_onError` bindings
- `CandidateSheet.tsx`: `useCallback` deps aligned with React Compiler inference
- `eslint.config.js`: allow Shadcn variant exports; disable Compiler purity / set-state-in-effect rules that conflict with standard Supabase fetch effects

---

## 2. Route walkthrough

| Route | File | Status | Tables | `employer_id` scoped? |
|-------|------|--------|--------|------------------------|
| `/` | CandidateLanding | Working (marketing) | — | n/a |
| `/recruiters` | RecruiterLanding | Working (marketing) | — | n/a |
| `/candidate/register` | Register | Working — **to be replaced** by anonymous apply | auth OTP | n/a |
| `/candidate/verify` | VerifyIdentity | Working — becomes optional `/me` | candidates | n/a (user_id) |
| `/candidate/shifts` | ShiftPreferences | Working — becomes optional `/me` | candidates | n/a |
| `/candidate/profile-complete` | ProfileComplete | Working static | — | n/a |
| `/candidate/jobs` | JobBoard | Working — **migrate to `/jobs`** | jobs, employers, applications, candidates | jobs public; apply writes candidate |
| `/candidate/applications` | Applications | Working — **migrate to `/me/applications`** | applications | candidate_id |
| `/candidate/ratings` | Ratings | Working | ratings, applications | candidate_id |
| `/recruiter/login` | Login | Working | auth, recruiter_employers | membership check |
| `/recruiter/post-job` | PostJob | Working — over friction budget when “More options” open | jobs, recruiter_employers | recruiter_id + employer_id |
| `/recruiter/applicants` | ManageApplicants | Working — **migrate to `/recruiter/jobs/:id` list** | applications, jobs | employer_id ✅ |
| `/recruiter/jobs` | JobPerformance | Working (Session 7) | jobs, job_views, applications | recruiter_id |
| `/recruiter/candidate/:id` | CandidateProfile | Working | applications, candidates, jobs, events | employer_id ✅ |
| `/recruiter/ratings` | Ratings | Working | ratings, applications | recruiter_id |
| `/auth/callback` | MagicLinkHandler | Working | auth, candidates, recruiter_employers | n/a |
| `/waitlist-confirmation` | WaitlistConfirmation | Placeholder leftover | — | n/a |
| `/settings` | Settings | Working (delete account TODO) | employers, candidates | employer / user |
| `/404`, `*` | NotFound | Working | — | n/a |
| `/jobs` | — | **Missing** (Phase 4) | — | — |
| `/me/applications` | — | **Missing** (Phase 4) | — | — |
| `/privacy`, `/terms` | — | **Missing** (Phase 7) | — | — |

---

## 3. Full postcode inventory (privacy risk)

| Location | Behaviour | Risk |
|----------|-----------|------|
| `candidates.postcode` | Full UK postcode stored in DB | **High** — Phase 2 adds `partial_postcode` + lat/lng; legacy column left for Tom to null |
| `applications.candidate_postcode` | Full postcode on application row | **High** — stop writing; use candidate.partial_postcode |
| `jobs.postcode` | Site postcode (employer premises) | Medium — Phase 3 `resolve-site-postcode` may keep precise lat/lng; store `partial_postcode` too |
| `Register.tsx` / `MagicLinkHandler.tsx` | Collect & persist full postcode | **High** |
| `JobBoard.tsx` apply form | Full postcode → Postcodes.io client-side + DB | **High** — move to Edge Function only |
| `PostJob.tsx` | Full site postcode stored | Medium |
| `commuteScoring.ts` | Client calls Postcodes.io with full postcode | **High** — replace with resolve-postcode EF |
| `localStorage` `hirefast_candidate_postcode` / pending candidate | Full postcode | **High** — replace with `hf_loc` (partial + centroid only) |
| Recruiter UI (`CandidateSheet`, `CandidateProfile`) | Displays outward code only | OK (display) |
| `job-match-notify` | Matches on outward code | OK |

**Target state:** full postcode exists only inside `resolve-postcode` / `resolve-site-postcode` Edge Functions for the duration of the request. Never in DB, UI, logs, or localStorage.

---

## 4. Forms & field counts

| Form | Fields | Within budget? |
|------|--------|----------------|
| Candidate register | 3 (name, email, postcode) | ✅ but pre-apply wall — remove |
| Verify identity | 4 | ❌ mandatory onboarding — make optional |
| Shift preferences | multi-select groups | ❌ mandatory — make optional |
| Apply sheet | 3 (name, phone, postcode) | ✅ keep as 3+2 Rule core |
| Recruiter login | 1 (email) | ✅ |
| Post job (core) | 5 | ✅ at limit; “More options” adds more — Phase 5 templates |
| Employer settings | 5 | ✅ |
| Ratings | 2 | ✅ |

---

## 5. Schema assumptions (for Phase 2 migration)

Live core tables are **not** fully versioned in-repo (only phase2 deltas, ratings RLS, job_views). Types + docs imply:

- `candidates.user_id`, `full_name`, `phone`, `postcode`, `candidate_skills`, `has_rtw`, …
- `jobs.employer_id`, `recruiter_id`, `sector`, `postcode`, `required_skills`, `is_active`, …
- `applications.candidate_id`, `job_id`, `employer_id`, `status`, `created_at`, …
- `recruiter_employers.user_id`, `employer_id`

**Migration adaptations:**
- Add `partial_postcode`, `loc_lat`, `loc_lng`, `rtw_status`, `skills` on candidates (keep legacy `postcode` / `candidate_skills` / `has_rtw` for compatibility; prefer new columns in app code).
- Add job columns including `is_published` (backfill from `is_active`), `sponsorship_available`, `max_commute_miles`.
- Applications: extend `status` check to Truth Engine statuses; add `status_updated_at`, `apply_duration_ms`. Existing statuses (`pending`, `shortlisted`, `rejected`) mapped via backfill where needed.
- Unique index `(job_id, candidate_id)` — may conflict with historical `(job_id, email)` uniqueness; migration uses `IF NOT EXISTS` / documents conflict.
- RLS: replace policies by name; helpers `is_org_member`, `my_candidate_id`; RPC `get_job_applicants`, `get_employer_response_rates`.

---

## 6. Gaps vs Truth Engine v2 spec

1. No anonymous sign-in apply path; mandatory register → verify → shifts before jobs.
2. No `truth-engine.ts` / server-side `get_job_applicants` scoring.
3. Full postcodes stored and scored client-side.
4. Design system is dark navy/glass — must migrate to Clean Enterprise (white / slate / blue-600).
5. No Vaul drawer (Radix Sheet used); need Drawer for apply / post-job.
6. No `/privacy` or `/terms`.
7. Recruiter multi-org switcher missing (single `maybeSingle()` employer).
8. Response-rate / ghosting dashboard metrics missing.
9. Core RLS not versioned in git.
10. No vitest / `npm test`.

---

## 7. Cross-org access test (Phase 5)

**Status:** Pending live Supabase. After deploy, Tom should:
1. Sign in as recruiter for employer A.
2. Attempt to open `/recruiter/jobs/<employer-B-job-id>` and call `get_job_applicants` for a B job.
3. Expect empty / RLS deny — document result below.

**Result:** _Not run in this cloud environment (no live Supabase credentials for two orgs)._

---

## 8. Manual steps for Tom

_(Also mirrored at end of run — keep in sync with Phase 8.)_

1. Supabase → Authentication → enable **Anonymous sign-ins** (consider CAPTCHA/Turnstile).
2. Supabase → Authentication → URL configuration: Site URL + `/auth/callback` redirects (local + production).
3. Run migration `supabase/migrations/20260919000000_truth_engine_v2.sql` after reviewing reconciled names.
4. Deploy Edge Functions: `resolve-postcode`, `resolve-site-postcode`.
5. After verifying `partial_postcode` backfill, run the commented legacy clean-up (`UPDATE … SET postcode = null`).
6. Confirm Anonymous + magic-link email templates look correct.
7. Cross-org access smoke test (section 7).

---

## 9. Unfinished / deferred

_Filled at end of run._
