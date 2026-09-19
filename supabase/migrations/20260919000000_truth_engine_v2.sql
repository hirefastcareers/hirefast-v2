-- =====================================================================
-- HireFast — Truth Engine v2
-- Privacy-safe location, RTW, skills, status accountability, org-scoped RLS
-- Adapted to live schema (candidates.postcode, candidate_skills, has_rtw;
-- applications.status historically 'pending'|'shortlisted'|'rejected';
-- jobs.is_active / sector / required_skills already present).
-- =====================================================================

-- ---------- Helpers (security definer to avoid RLS recursion) ----------
create or replace function public.is_org_member(p_employer_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.recruiter_employers re
    where re.employer_id = p_employer_id
      and re.user_id = auth.uid()
  );
$$;

create or replace function public.my_candidate_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select c.id from public.candidates c where c.user_id = auth.uid() limit 1;
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.my_candidate_id() from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.my_candidate_id() to authenticated;

-- ---------- Candidates ----------
alter table public.candidates
  add column if not exists partial_postcode text,
  add column if not exists loc_lat numeric(7,3),
  add column if not exists loc_lng numeric(7,3),
  add column if not exists rtw_status text,
  add column if not exists skills text[];

-- Defaults for new columns (safe if column already existed without default)
update public.candidates set rtw_status = 'unknown' where rtw_status is null;
update public.candidates set skills = coalesce(candidate_skills, '{}') where skills is null;
alter table public.candidates alter column rtw_status set default 'unknown';
alter table public.candidates alter column skills set default '{}';
alter table public.candidates alter column rtw_status set not null;
alter table public.candidates alter column skills set not null;

-- Backfill partial_postcode from legacy full postcode (outward = all but last 3 chars)
update public.candidates
set partial_postcode = upper(trim(regexp_replace(
  left(replace(postcode, ' ', ''), greatest(length(replace(postcode, ' ', '')) - 3, 0)),
  '[^A-Z0-9]', '', 'g'
)))
where partial_postcode is null
  and postcode is not null
  and length(replace(postcode, ' ', '')) >= 5;

-- Map legacy has_rtw boolean → rtw_status where still unknown
update public.candidates
set rtw_status = case
  when has_rtw = true then 'has_right_to_work'
  when has_rtw = false then 'needs_sponsorship'
  else rtw_status
end
where rtw_status = 'unknown' and has_rtw is not null;

alter table public.candidates drop constraint if exists candidates_rtw_status_check;
alter table public.candidates add constraint candidates_rtw_status_check
  check (rtw_status in ('has_right_to_work', 'needs_sponsorship', 'unknown'));

create unique index if not exists candidates_user_id_uniq on public.candidates(user_id);

-- ---------- Jobs ----------
alter table public.jobs
  add column if not exists partial_postcode text,
  add column if not exists loc_lat numeric(9,6),
  add column if not exists loc_lng numeric(9,6),
  add column if not exists sponsorship_available boolean,
  add column if not exists max_commute_miles numeric(5,1),
  add column if not exists is_published boolean;

-- sector / required_skills already exist on live jobs — ensure defaults
alter table public.jobs alter column required_skills set default '{}';
update public.jobs set required_skills = '{}' where required_skills is null;

update public.jobs set sponsorship_available = false where sponsorship_available is null;
update public.jobs set max_commute_miles = 20 where max_commute_miles is null;
update public.jobs set is_published = coalesce(is_active, true) where is_published is null;

alter table public.jobs alter column sponsorship_available set default false;
alter table public.jobs alter column max_commute_miles set default 20;
alter table public.jobs alter column is_published set default true;
alter table public.jobs alter column sponsorship_available set not null;
alter table public.jobs alter column max_commute_miles set not null;
alter table public.jobs alter column is_published set not null;

-- Backfill job partial_postcode from legacy postcode
update public.jobs
set partial_postcode = upper(trim(regexp_replace(
  left(replace(postcode, ' ', ''), greatest(length(replace(postcode, ' ', '')) - 3, 0)),
  '[^A-Z0-9]', '', 'g'
)))
where partial_postcode is null
  and postcode is not null
  and length(replace(postcode, ' ', '')) >= 5;

-- ---------- Applications ----------
alter table public.applications
  add column if not exists status_updated_at timestamptz,
  add column if not exists apply_duration_ms integer;

update public.applications set status_updated_at = coalesce(created_at, now()) where status_updated_at is null;
alter table public.applications alter column status_updated_at set default now();
alter table public.applications alter column status_updated_at set not null;

-- Map legacy statuses → Truth Engine vocabulary before tightening the check
update public.applications set status = 'applied' where status is null or status in ('pending', 'new');
update public.applications set status = 'rejected' where status in ('auto_rejected', 'declined');
-- leave shortlisted / hired / etc. if already present

-- Ensure status has a default
alter table public.applications alter column status set default 'applied';
update public.applications set status = 'applied' where status is null;
alter table public.applications alter column status set not null;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in ('applied','viewed','shortlisted','interview','offered','hired','rejected','withdrawn'));

-- Prefer (job_id, candidate_id) uniqueness for authenticated apply.
-- Historical (job_id, email) unique may still exist — leave it; both can coexist.
create unique index if not exists applications_job_candidate_uniq
  on public.applications(job_id, candidate_id)
  where candidate_id is not null;

create or replace function public.touch_application_status()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists trg_touch_application_status on public.applications;
create trigger trg_touch_application_status
  before update on public.applications
  for each row execute function public.touch_application_status();

-- ---------- RLS ----------
alter table public.candidates   enable row level security;
alter table public.jobs         enable row level security;
alter table public.applications enable row level security;

-- Drop known legacy + new policy names to avoid stacking duplicates
do $$
declare
  pol text;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'candidates'
  loop
    execute format('drop policy if exists %I on public.candidates', pol);
  end loop;
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'jobs'
  loop
    execute format('drop policy if exists %I on public.jobs', pol);
  end loop;
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'applications'
  loop
    execute format('drop policy if exists %I on public.applications', pol);
  end loop;
end $$;

-- Candidates: own row only. Recruiters read applicants via get_job_applicants() RPC.
create policy "candidates_select_own" on public.candidates
  for select to authenticated using (user_id = auth.uid());
create policy "candidates_insert_own" on public.candidates
  for insert to authenticated with check (user_id = auth.uid());
create policy "candidates_update_own" on public.candidates
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Jobs: published jobs are public; org members manage their own.
create policy "jobs_select_public_or_org" on public.jobs
  for select to anon, authenticated
  using (is_published or public.is_org_member(employer_id));
create policy "jobs_insert_org" on public.jobs
  for insert to authenticated with check (public.is_org_member(employer_id));
create policy "jobs_update_org" on public.jobs
  for update to authenticated
  using (public.is_org_member(employer_id)) with check (public.is_org_member(employer_id));
create policy "jobs_delete_org" on public.jobs
  for delete to authenticated using (public.is_org_member(employer_id));

-- Applications
create policy "applications_candidate_select" on public.applications
  for select to authenticated using (candidate_id = public.my_candidate_id());
create policy "applications_candidate_insert" on public.applications
  for insert to authenticated
  with check (candidate_id = public.my_candidate_id() and status = 'applied');
create policy "applications_candidate_withdraw" on public.applications
  for update to authenticated
  using (candidate_id = public.my_candidate_id())
  with check (candidate_id = public.my_candidate_id() and status = 'withdrawn');
create policy "applications_org_select" on public.applications
  for select to authenticated
  using (exists (select 1 from public.jobs j
                 where j.id = applications.job_id and public.is_org_member(j.employer_id)));
create policy "applications_org_update" on public.applications
  for update to authenticated
  using (exists (select 1 from public.jobs j
                 where j.id = applications.job_id and public.is_org_member(j.employer_id)))
  with check (status <> 'withdrawn');

-- ---------- Server-side scoring for recruiters (tamper-proof) ----------
-- Constants MUST match src/lib/truth-engine.ts
-- Prefers candidates.skills / partial_postcode / rtw_status; falls back to legacy columns.
create or replace function public.get_job_applicants(p_job_id uuid)
returns table (
  application_id      uuid,
  candidate_id        uuid,
  full_name           text,
  phone               text,
  partial_postcode    text,
  rtw_status          text,
  skills              text[],
  status              text,
  applied_at          timestamptz,
  status_updated_at   timestamptz,
  commute_miles       numeric,
  commute_minutes_est integer,
  location_score      integer,
  skills_score        integer,
  overall_score       integer,
  is_partial          boolean,
  rtw_flag            text
)
language sql stable security definer set search_path = public
as $$
  with base as (
    select
      a.id  as app_id,
      c.id as cand_id,
      coalesce(c.full_name, a.full_name) as c_name,
      coalesce(c.phone, a.phone) as c_phone,
      coalesce(c.partial_postcode, a.candidate_postcode) as c_pc,
      coalesce(c.rtw_status, 'unknown') as c_rtw,
      coalesce(nullif(c.skills, '{}'), c.candidate_skills, a.candidate_skills, '{}'::text[]) as c_skills,
      a.status as a_status,
      a.created_at as a_created,
      coalesce(a.status_updated_at, a.created_at) as a_updated,
      coalesce(j.required_skills, '{}'::text[]) as j_skills,
      coalesce(j.sponsorship_available, false) as j_sponsor,
      greatest(coalesce(j.max_commute_miles, 20), 4) as max_miles,
      lower(coalesce(j.sector, '')) as j_sector,
      case when c.loc_lat is null or j.loc_lat is null then null else
        3958.8 * 2 * asin(sqrt(
          power(sin(radians((j.loc_lat - c.loc_lat)::float8) / 2), 2) +
          cos(radians(c.loc_lat::float8)) * cos(radians(j.loc_lat::float8)) *
          power(sin(radians((j.loc_lng - c.loc_lng)::float8) / 2), 2)
        ))
      end as miles
    from public.applications a
    join public.candidates c on c.id = a.candidate_id
    join public.jobs j       on j.id = a.job_id
    where a.job_id = p_job_id
      and public.is_org_member(j.employer_id)
  ),
  scored as (
    select b.*,
      case
        when b.miles is null then null
        when b.miles <= 3 then 100
        when b.miles >= b.max_miles then 0
        else round(100 * (b.max_miles - b.miles) / (b.max_miles - 3))
      end as loc_s,
      case
        when coalesce(array_length(b.j_skills, 1), 0) = 0 then 100
        when coalesce(array_length(b.c_skills, 1), 0) = 0 then null
        else round(100.0 * (select count(*) from unnest(b.j_skills) rs where rs = any(b.c_skills))
                   / array_length(b.j_skills, 1))
      end as sk_s,
      case when b.j_sector in ('engineering', 'manufacturing') then 0.5 else 0.6 end as w_loc,
      case
        when b.c_rtw = 'needs_sponsorship' and not b.j_sponsor then 'risk'
        when b.c_rtw = 'unknown' then 'warning'
        else 'match'
      end as rtw_f
    from base b
  )
  select
    s.app_id, s.cand_id, s.c_name, s.c_phone, s.c_pc, s.c_rtw, s.c_skills,
    s.a_status, s.a_created, s.a_updated,
    round(s.miles::numeric, 1),
    case when s.miles is null then null else round(s.miles * 1.3 / 25 * 60 + 5)::int end,
    s.loc_s::int,
    s.sk_s::int,
    case
      when s.loc_s is null and s.sk_s is null then null
      else least(
        case when s.rtw_f = 'risk' then 25 else 100 end,
        round(case
          when s.loc_s is null then s.sk_s
          when s.sk_s  is null then s.loc_s
          else s.loc_s * s.w_loc + s.sk_s * (1 - s.w_loc)
        end)
      )::int
    end,
    (s.loc_s is null or s.sk_s is null),
    s.rtw_f
  from scored s
  order by 15 desc nulls last, s.a_created asc;
$$;

revoke all on function public.get_job_applicants(uuid) from public;
grant execute on function public.get_job_applicants(uuid) to authenticated;

-- ---------- Ghosting accountability: public employer response rates ----------
create or replace function public.get_employer_response_rates()
returns table (employer_id uuid, response_rate integer, sample_size integer)
language sql stable security definer set search_path = public
as $$
  select
    j.employer_id,
    case when count(*) >= 5 then
      round(100.0 * count(*) filter (where a.status not in ('applied', 'viewed')) / count(*))::int
    end,
    count(*)::int
  from public.applications a
  join public.jobs j on j.id = a.job_id
  where a.created_at < now() - interval '5 days'
  group by j.employer_id;
$$;

revoke all on function public.get_employer_response_rates() from public;
grant execute on function public.get_employer_response_rates() to anon, authenticated;

-- ---------- Legacy full-postcode clean-up ----------
-- Agent: partial_postcode has been backfilled above.
-- LEAVE THE BLOCK BELOW COMMENTED. Tom will run it manually after verifying.
-- update public.candidates set postcode = null where partial_postcode is not null;
-- update public.applications set candidate_postcode = null where candidate_id is not null;
-- update public.jobs set postcode = null where partial_postcode is not null;
