# Supabase query scope audit: employer_id / recruiter_id

Audit of every Supabase data query (`.from(...)` read/update/insert/delete) to confirm tenant scoping by `employer_id` or `recruiter_id` where applicable. Candidate-scoped flows (e.g. `candidate_id`, `user_id` on `candidates`) are intentionally not employer/recruiter-scoped.

---

## Summary

- **Fixed in code:** `ManageApplicants.tsx` — `updateStatus` now scopes applications update by `employer_id`.
- **Flagged (rely on RLS or context):** Queries that do not explicitly filter by `employer_id`/`recruiter_id` but are either candidate-scoped, protected by RLS, or use IDs derived from already-scoped data. Ensure RLS is correct for these.
- **Edge functions:** Use service role and intentionally cross tenants for batch jobs; no change required.

---

## 1. Candidate-facing pages

### `src/pages/candidate/JobBoard.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` active jobs | jobs | No | **By design:** public job board; filter `.eq("is_active", true)` only. RLS must restrict SELECT to active jobs (or public read). |
| `insert` job view | job_views | N/A | Insert by `job_id`. RLS `job_views_insert_active_job` restricts to active jobs. |
| `select` candidate | candidates | N/A | `.eq("user_id", userId)` — candidate’s own row. |
| `select` applications | applications | N/A | `.eq("candidate_id", candidateData.id)` — candidate’s own applications. |
| `insert` application | applications | N/A | Payload includes `employer_id`; RLS validates insert. |
| `select` job by id | jobs | No | `.eq("id", applyJob.id)` — single job for apply flow. RLS must restrict. |
| `update` application (score) | applications | **Flag** | `.eq("id", applicationId)` only. Candidate is updating their own application; RLS must restrict to `candidate_id = (candidate for auth user)`. |
| `update` application (auto-reject) | applications | **Flag** | Same as above. |
| `insert` application_event | application_events | N/A | Insert by `application_id`; RLS must restrict to application owned by candidate. |

### `src/pages/candidate/Applications.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` candidate | candidates | N/A | `.eq("user_id", session.user.id)`. |
| `select` applications | applications | N/A | `.eq("candidate_id", candidateRow.id)`. |

### `src/pages/candidate/Ratings.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` candidate | candidates | N/A | `.eq("user_id", user.id)`. |
| `select` applications | applications | N/A | `.eq("candidate_id", candidate.id)`. |
| `select` ratings | ratings | N/A | `.eq("candidate_id", ...).eq("rated_by", "candidate")`. |
| `select` jobs | jobs | No | `.in("id", jobIds)`; jobIds from candidate’s applications. Candidate context; no employer/recruiter scope needed. |
| `select` employers | employers | No | `.in("id", employerIds)`; for candidate’s job list. Candidate context. |
| `insert` rating | ratings | N/A | Payload has `recruiter_id`, `candidate_id`; RLS enforces. |

### `src/pages/candidate/ShiftPreferences.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `update` candidates | candidates | N/A | `.eq("user_id", user.id)`. |

### `src/pages/candidate/VerifyIdentity.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `update` candidates | candidates | N/A | `.eq("user_id", user.id)`. |

### `src/pages/candidate/Register.tsx`

No data queries (auth only).

---

## 2. Recruiter-facing pages

### `src/pages/recruiter/JobPerformance.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` jobs | jobs | Yes | `.eq("recruiter_id", user.id)`. |
| `select` job_views | job_views | **Flag** | `.in("job_id", jobIds)` only. jobIds = recruiter’s jobs. **RLS** `job_views_select_own_jobs` restricts SELECT to jobs where `jobs.recruiter_id = auth.uid()`. Query not explicitly scoped; safe if RLS is enabled. |
| `select` applications | applications | **Flag** | `.in("job_id", jobIds)` only. Same as above; RLS on applications must restrict to recruiter’s employer. |

### `src/pages/recruiter/ManageApplicants.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` recruiter_employers | recruiter_employers | N/A | `.eq("user_id", user.id)`. |
| `select` jobs | jobs | Yes | `.eq("recruiter_id", user.id)`. |
| `select` applications | applications | Yes | `.eq("employer_id", recruiterEmployer.employer_id)`. |
| Realtime refetch applications | applications | Yes | `.eq("employer_id", employerId)`. |
| `update` applications (bulk interest) | applications | Yes | `.eq("id", id).eq("employer_id", employerId)`. |
| `insert` application_events | application_events | N/A | RLS must restrict. |
| `update` applications (bulk shortlist) | applications | Yes | `.eq("id", id).eq("employer_id", employerId)`. |
| `update` application (status) | applications | Yes | **Fixed:** now `.eq("id", applicationId).eq("employer_id", employerId)`. |
| `select` applications (after bulk) | applications | Yes | `.eq("employer_id", employerId)`. |

### `src/pages/recruiter/CandidateProfile.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` recruiter_employers | recruiter_employers | N/A | `.eq("user_id", user.id)`. |
| `select` application | applications | Yes | `.eq("id", id).eq("employer_id", recruiterEmployer.employer_id)`. |
| `select` job | jobs | Yes | `.eq("id", job_id).eq("recruiter_id", user.id)`. |
| `select` candidate | candidates | N/A | `.eq("id", application.candidate_id)`; application already employer-scoped. |
| `select` application_events | application_events | **Flag** | `.eq("application_id", id)` only. Application was loaded with employer_id; **RLS** on application_events should restrict to events for applications the user can access. |
| `update` applications (x4) | applications | Yes | `.eq("id", id).eq("employer_id", application.employer_id)`. |
| `insert` application_events | application_events | N/A | RLS. |

### `src/components/recruiter/CandidateSheet.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` application | applications | Yes | `.eq("id", applicationId).eq("employer_id", employerId)`. |
| `select` job | jobs | Yes | `.eq("id", job_id).eq("recruiter_id", user.id)`. |
| `select` candidate | candidates | N/A | By id from scoped application. |
| `select` application_events | application_events | **Flag** | `.eq("application_id", applicationId)` only. Same as CandidateProfile; RLS must enforce. |
| `update` applications (x2) | applications | Yes | `.eq("id", ...).eq("employer_id", employerId)`. |
| `insert` application_events | application_events | N/A | RLS. |

### `src/pages/recruiter/PostJob.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` recruiter_employers | recruiter_employers | N/A | `.eq("user_id", user.id)`. |
| `insert` jobs | jobs | Yes | Payload includes `employer_id`, `recruiter_id`. |

### `src/pages/recruiter/Ratings.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` recruiter_employers | recruiter_employers | N/A | `.eq("user_id", user.id)`. |
| `select` ratings (given/received) | ratings | Yes | `.eq("recruiter_id", user.id)`. |
| `select` applications | applications | Yes | `.eq("employer_id", recruiterEmployer.employer_id)`. |
| `select` jobs | jobs | **Flag** | `.in("id", jobIds)`; jobIds from employer-scoped applications. Query has no `recruiter_id`. **RLS** on jobs should restrict; add `.eq("recruiter_id", user.id)` for explicit scope. |
| `insert` rating | ratings | N/A | Payload has `recruiter_id: user.id`. |
| `select` job (title for card) | jobs | **Flag** | `.eq("id", rating.job_id).maybeSingle()` in RatingReceivedCard. rating is recruiter’s; no explicit recruiter_id in query. Add `.eq("recruiter_id", user.id)` for explicit scope (or ensure RLS). |

### `src/pages/recruiter/Login.tsx`

Auth only; no data queries.

---

## 3. Shared / lib

### `src/pages/shared/Settings.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` recruiter_employers | recruiter_employers | N/A | `.eq("user_id", user.id)`. |
| `select` candidates | candidates | N/A | `.eq("user_id", user.id)` (candidate mode). |
| `select` employers | employers | N/A | `.eq("id", employerIdRef)`; employerIdRef from recruiter_employers. Single-tenant; RLS should restrict to recruiter’s employer. |
| `update` jobs (deactivate all) | jobs | Yes | `.eq("recruiter_id", user.id)`. |
| `update` employers | employers | **Flag** | `.eq("id", employerId)` only. employerId from recruiter_employers; RLS must restrict update to “own” employer. |
| `update` candidates (CV) | candidates | N/A | `.eq("id", candidateId)`; candidateId from own candidate row. |
| Storage | cvs | N/A | Path includes user id. |

### `src/pages/shared/MagicLinkHandler.tsx`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `select` recruiter_employers | recruiter_employers | N/A | `.eq("user_id", session.user.id)`. |
| `select` candidates | candidates | N/A | `.eq("user_id", session.user.id)`. |
| `insert` candidates | candidates | N/A | New row for magic-link user. |

### `src/lib/commuteScoring.ts`

| Query | Table | Scoped? | Notes |
|-------|--------|--------|--------|
| `update` applications | applications | Yes | `.eq("id", ...).eq("employer_id", params.employerId)`. |
| `select` applications (backfill) | applications | Yes | `.eq("employer_id", employerId)`. |
| `select` jobs | jobs | Yes | `.eq("id", row.job_id).eq("employer_id", employerId)`. |
| `select` candidates | candidates | N/A | `.eq("id", row.candidate_id)`; row from employer-scoped applications. |
| `select` applications (one row) | applications | **Flag** | `.eq("id", row.id).single()`; row from employer-scoped list. Safe in practice; consider adding `.eq("employer_id", employerId)` for consistency. |
| `update` applications (backfill) | applications | Yes | `.eq("id", row.id).eq("employer_id", employerId)`. |

---

## 4. Edge functions (service role)

All use **service role** and are intended to operate across tenants for batch/cron jobs. No application-level employer/recruiter scoping required.

| Function | Queries | Note |
|----------|---------|------|
| **job-match-notify** | jobs (active, recent), jobs by id, candidates (by postcode) | Batch: match candidates to jobs. |
| **status-feed-sms** | application_events, applications by id, application_events update | Batch: send SMS for events. |
| **bulk-reengagement** | applications (pending, dormant), applications update, application_events insert | Batch: re-engage candidates. |
| **ratings-trigger** | jobs (closed, no trigger sent), applications by job_id, application_events insert, jobs update | Batch: prompt ratings. |

---

## 5. Recommended follow-ups

1. **RLS:** Confirm RLS policies for `applications`, `application_events`, `jobs`, `employers`, and `job_views` so that any query flagged above is safe when the query itself does not include `employer_id`/`recruiter_id`.
2. **Explicit scope where easy:** In recruiter code, consider adding `.eq("recruiter_id", user.id)` or `.eq("employer_id", employerId)` to:
   - `JobPerformance.tsx`: applications and job_views (or rely on RLS).
   - `recruiter/Ratings.tsx`: jobs select by id and jobs select in list (and RatingReceivedCard job fetch).
3. **Candidate application updates:** Ensure RLS on `applications` restricts UPDATE to rows where `candidate_id` matches the candidate for `auth.uid()` (so candidate can only update their own application for scoring/auto-reject).

---

*Audit date: 2025-03-01. Code fix: ManageApplicants updateStatus scoped by employer_id.*
