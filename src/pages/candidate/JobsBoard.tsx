import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search } from "lucide-react";
import { motion } from "framer-motion";
import { HireFastLogo } from "@/components/ui/HireFastLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplyDrawer } from "@/components/candidate/ApplyDrawer";
import { supabase } from "@/lib/supabase";
import { loadHfLoc, resolvePostcode, saveHfLoc, type HfLoc } from "@/lib/location";
import { formatMiles, formatMinutesEst, formatPayPerHour } from "@/lib/format";
import { scoreMatch, TONE_STYLES, type RtwStatus } from "@/lib/truth-engine";
import type { EmployerResponseRate, Job } from "@/types";
import { cn } from "@/lib/utils";

type JobRow = Job & {
  employers?: { company_name: string | null } | null;
};

type LoadState = "loading" | "ready" | "error";

function parsePayPerHour(payRate: string | null | undefined): number | null {
  if (!payRate) return null;
  const m = payRate.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

export default function JobsBoard() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [rates, setRates] = useState<Record<string, number | null>>({});
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [loc, setLoc] = useState<HfLoc | null>(() => loadHfLoc());
  const [postcodeDraft, setPostcodeDraft] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [rtwStatus, setRtwStatus] = useState<RtwStatus>("unknown");
  const [applyJob, setApplyJob] = useState<JobRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError(null);
    try {
      const [jobsRes, ratesRes] = await Promise.all([
        supabase
          .from("jobs")
          .select(
            "id, employer_id, recruiter_id, title, location_name, partial_postcode, loc_lat, loc_lng, sector, pay_rate, description, shift_patterns, required_skills, sponsorship_available, max_commute_miles, is_published, created_at, employers(company_name)",
          )
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        supabase.rpc("get_employer_response_rates"),
      ]);

      if (jobsRes.error) throw jobsRes.error;

      setJobs((jobsRes.data ?? []) as unknown as JobRow[]);
      const rateMap: Record<string, number | null> = {};
      for (const row of (ratesRes.data ?? []) as EmployerResponseRate[]) {
        rateMap[row.employer_id] = row.response_rate;
      }
      setRates(rateMap);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: cand } = await supabase
          .from("candidates")
          .select("skills, rtw_status, partial_postcode, loc_lat, loc_lng")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cand) {
          setCandidateSkills((cand.skills as string[]) ?? []);
          setRtwStatus((cand.rtw_status as RtwStatus) ?? "unknown");
          if (
            typeof cand.loc_lat === "number" &&
            typeof cand.loc_lng === "number" &&
            cand.partial_postcode
          ) {
            const fromProfile: HfLoc = {
              partial_postcode: cand.partial_postcode,
              lat: Number(cand.loc_lat),
              lng: Number(cand.loc_lng),
            };
            setLoc(fromProfile);
            saveHfLoc(fromProfile);
          }
        }
      }

      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load jobs.");
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitPostcode(e: React.FormEvent) {
    e.preventDefault();
    setLocError(null);
    setLocBusy(true);
    try {
      const resolved = await resolvePostcode(postcodeDraft);
      saveHfLoc(resolved);
      setLoc(resolved);
      setPostcodeDraft("");
    } catch (err) {
      setLocError(
        err instanceof Error
          ? err.message.replace(/_/g, " ")
          : "Could not resolve postcode",
      );
    } finally {
      setLocBusy(false);
    }
  }

  const scored = useMemo(() => {
    return jobs.map((job) => {
      const match = scoreMatch(
        {
          lat: loc?.lat ?? null,
          lng: loc?.lng ?? null,
          skills: candidateSkills,
          rtwStatus,
        },
        {
          lat: job.loc_lat != null ? Number(job.loc_lat) : null,
          lng: job.loc_lng != null ? Number(job.loc_lng) : null,
          requiredSkills: job.required_skills ?? [],
          sponsorshipAvailable: Boolean(job.sponsorship_available),
          maxCommuteMiles: job.max_commute_miles != null ? Number(job.max_commute_miles) : 20,
          sector: job.sector,
        },
      );
      return { job, match };
    });
  }, [jobs, loc, candidateSkills, rtwStatus]);

  const sorted = useMemo(() => {
    const copy = [...scored];
    if (loc) {
      copy.sort((a, b) => (b.match.overall ?? -1) - (a.match.overall ?? -1));
    } else {
      copy.sort(
        (a, b) =>
          new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime(),
      );
    }
    return copy;
  }, [scored, loc]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/">
            <HireFastLogo size="md" />
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link to="/jobs" className="font-medium text-blue-600">
              Jobs
            </Link>
            <Link to="/me/applications" className="text-slate-500 hover:text-slate-900">
              My applications
            </Link>
            <Link to="/me" className="text-slate-500 hover:text-slate-900">
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <div className="sticky top-[57px] z-30 border-b border-slate-200 bg-white/95 px-4 py-3">
        <form
          onSubmit={submitPostcode}
          className="mx-auto flex max-w-3xl gap-2"
        >
          <div className="relative flex-1">
            <MapPin className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              inputMode="text"
              autoComplete="postal-code"
              placeholder={loc ? `Your postcode: ${loc.partial_postcode}` : "Your postcode"}
              value={postcodeDraft}
              onChange={(e) => setPostcodeDraft(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-white pl-9"
              aria-label="Your postcode"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={locBusy || !postcodeDraft.trim()}
            className="h-11 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700"
          >
            <Search className="size-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Set</span>
          </Button>
        </form>
        {loc && (
          <p className="mx-auto mt-1.5 max-w-3xl text-xs text-slate-500">
            Matching near <span className="font-medium tabular-nums">{loc.partial_postcode}</span> — full postcode never stored.
          </p>
        )}
        {locError && (
          <p className="mx-auto mt-1.5 max-w-3xl text-xs text-rose-700" role="alert">
            {locError}
          </p>
        )}
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {state === "loading" && (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        )}

        {state === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="font-semibold text-rose-800">Could not load jobs</p>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <Button
              size="lg"
              className="mt-4 rounded-xl bg-blue-600 text-white"
              onClick={() => void load()}
            >
              Try again
            </Button>
          </div>
        )}

        {state === "ready" && sorted.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <div className="mx-auto mb-3 flex size-[52px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
              <Search className="size-6 text-slate-400" />
            </div>
            <h2 className="font-semibold text-slate-900">No jobs yet</h2>
            <p className="mt-1 text-sm text-slate-500">
              Check back soon — new roles appear here as soon as employers publish them.
            </p>
          </div>
        )}

        {state === "ready" && sorted.length > 0 && (
          <ul className="space-y-3">
            {sorted.map(({ job, match }, index) => {
              const company = job.employers?.company_name ?? "Employer";
              const rate = rates[job.employer_id];
              const tone = match.tone;
              const pay = parsePayPerHour(job.pay_rate);
              const shift = job.shift_patterns?.[0] ?? "Flexible";

              return (
                <motion.li
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.03, 0.2) }}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                        {job.title}
                      </h2>
                      <p className="text-sm text-slate-500">{company}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums text-slate-900">
                      {formatPayPerHour(pay)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="tabular-nums">{job.partial_postcode ?? "—"}</span>
                    {" · "}
                    {shift}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {loc && match.miles != null && (
                      <>
                        <span className="tabular-nums text-slate-600">
                          {formatMiles(match.miles)}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="tabular-nums text-slate-600">
                          {formatMinutesEst(match.minutesEst)}
                        </span>
                      </>
                    )}
                    {match.overall != null && tone && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium tabular-nums",
                          TONE_STYLES[tone].badge,
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", TONE_STYLES[tone].dot)} />
                        {match.overall}%
                        {match.isPartial ? " partial" : ""}
                      </span>
                    )}
                    {match.rtw && (
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-medium",
                          TONE_STYLES[match.rtw].badge,
                        )}
                      >
                        RTW {match.rtw}
                      </span>
                    )}
                    <span className="text-slate-500">
                      {rate == null
                        ? "New employer"
                        : `Replies to ${rate}% of applicants`}
                    </span>
                  </div>
                  {match.isPartial && loc && (
                    <p className="mt-2 text-xs text-slate-500">
                      Add skills to sharpen your match
                    </p>
                  )}

                  <motion.div whileTap={{ scale: 0.98 }} className="mt-4">
                    <Button
                      size="lg"
                      className="h-12 w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      onClick={() => {
                        setApplyJob(job);
                        setDrawerOpen(true);
                      }}
                    >
                      Apply
                    </Button>
                  </motion.div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </main>

      <ApplyDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        job={applyJob}
        employerName={applyJob?.employers?.company_name}
        loc={loc}
        onLocChange={setLoc}
        onApplied={() => {
          /* list stays; success lives in drawer */
        }}
        onProfileUpdated={(patch) => {
          if (patch.rtw_status) setRtwStatus(patch.rtw_status);
          if (patch.skills) setCandidateSkills(patch.skills);
        }}
      />
    </div>
  );
}
