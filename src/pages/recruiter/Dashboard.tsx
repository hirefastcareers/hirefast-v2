import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, Briefcase, Clock } from "lucide-react";
import RecruiterShell from "@/layouts/RecruiterShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

interface JobSummary {
  id: string;
  title: string;
  partial_postcode: string | null;
  is_published: boolean;
  created_at: string;
}

export default function RecruiterDashboard() {
  const { loading: orgLoading, isRecruiter, employerId } = useOrg();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [awaiting, setAwaiting] = useState(0);
  const [oldestDays, setOldestDays] = useState(0);
  const [responseRate, setResponseRate] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employerId) return;
    setState("loading");
    setError(null);
    try {
      const { data: jobRows, error: jobError } = await supabase
        .from("jobs")
        .select("id, title, partial_postcode, is_published, created_at")
        .eq("employer_id", employerId)
        .order("created_at", { ascending: false });
      if (jobError) throw jobError;
      setJobs((jobRows ?? []) as JobSummary[]);

      const jobIds = (jobRows ?? []).map((j) => j.id);
      if (jobIds.length === 0) {
        setAwaiting(0);
        setOldestDays(0);
      } else {
        const { data: apps, error: appError } = await supabase
          .from("applications")
          .select("id, status, created_at, status_updated_at")
          .in("job_id", jobIds)
          .in("status", ["applied", "viewed"]);
        if (appError) throw appError;
        const list = apps ?? [];
        setAwaiting(list.length);
        const now = Date.now();
        const maxDays = list.reduce((max, a) => {
          const t = new Date(a.created_at).getTime();
          return Math.max(max, Math.floor((now - t) / 86_400_000));
        }, 0);
        setOldestDays(maxDays);
      }

      const { data: rates } = await supabase.rpc("get_employer_response_rates");
      const mine = (rates ?? []).find(
        (r: { employer_id: string }) => r.employer_id === employerId,
      );
      setResponseRate(mine?.response_rate ?? null);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
      setState("error");
    }
  }, [employerId]);

  useEffect(() => {
    if (employerId) void load();
  }, [employerId, load]);

  async function rejectStale() {
    if (!employerId) return;
    if (
      !window.confirm(
        "Reject all unreviewed applications older than 14 days? Candidates will see a Rejected status.",
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
      const { data: jobRows } = await supabase
        .from("jobs")
        .select("id")
        .eq("employer_id", employerId);
      const jobIds = (jobRows ?? []).map((j) => j.id);
      if (jobIds.length === 0) {
        setBulkMsg("No jobs.");
        return;
      }
      const { data: updated, error: updError } = await supabase
        .from("applications")
        .update({ status: "rejected" })
        .in("job_id", jobIds)
        .in("status", ["applied", "viewed"])
        .lt("created_at", cutoff)
        .select("id");
      if (updError) throw updError;
      setBulkMsg(`Rejected ${updated?.length ?? 0} application(s).`);
      await load();
    } catch (e) {
      setBulkMsg(e instanceof Error ? e.message : "Bulk reject failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  if (!orgLoading && !isRecruiter) {
    return <Navigate to="/recruiter/login" replace />;
  }

  const awaitingTone =
    oldestDays > 5 ? "rose" : oldestDays > 3 ? "amber" : "neutral";

  return (
    <RecruiterShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Keep the loop closed — silence costs candidates.
            </p>
          </div>
          <Button asChild size="lg" className="rounded-xl bg-blue-600 text-white">
            <Link to="/recruiter/post-job">Post a job</Link>
          </Button>
        </div>

        {state === "loading" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        )}

        {state === "error" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            {error}
            <Button size="lg" className="mt-3 rounded-xl" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        )}

        {state === "ready" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-sm",
                  awaitingTone === "rose" && "border-rose-200",
                  awaitingTone === "amber" && "border-amber-200",
                  awaitingTone === "neutral" && "border-slate-200",
                )}
              >
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock className="size-4" />
                  Awaiting a reply
                </div>
                <p
                  className={cn(
                    "mt-2 text-3xl font-bold tabular-nums",
                    awaitingTone === "rose" && "text-rose-700",
                    awaitingTone === "amber" && "text-amber-700",
                    awaitingTone === "neutral" && "text-slate-900",
                  )}
                >
                  {awaiting}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Oldest waiting{" "}
                  <span className="tabular-nums">{oldestDays}</span> day
                  {oldestDays === 1 ? "" : "s"}
                  {awaitingTone !== "neutral" && (
                    <span
                      className={cn(
                        "ml-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium",
                        awaitingTone === "amber" &&
                          "bg-amber-50 text-amber-700 border border-amber-200",
                        awaitingTone === "rose" &&
                          "bg-rose-50 text-rose-700 border border-rose-200",
                      )}
                    >
                      <AlertTriangle className="size-3" />
                      {awaitingTone === "rose" ? "> 5 days" : "> 3 days"}
                    </span>
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Briefcase className="size-4" />
                  Your public response rate
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">
                  {responseRate == null ? "—" : `${responseRate}%`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Candidates see this on your job ads.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">Ghosting controls</h2>
              <p className="mt-1 text-sm text-slate-500">
                Closing the loop beats silence.
              </p>
              <Button
                size="lg"
                variant="outline"
                className="mt-3 min-h-11 rounded-xl"
                disabled={bulkBusy}
                onClick={() => void rejectStale()}
              >
                {bulkBusy
                  ? "Working…"
                  : "Reject all unreviewed older than 14 days"}
              </Button>
              {bulkMsg && <p className="mt-2 text-sm text-slate-600">{bulkMsg}</p>}
            </div>

            <section>
              <h2 className="mb-2 font-semibold text-slate-900">Your jobs</h2>
              {jobs.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <p className="font-semibold">No jobs yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Post your first role in five fields.
                  </p>
                  <Button asChild size="lg" className="mt-4 rounded-xl bg-blue-600 text-white">
                    <Link to="/recruiter/post-job">Post a job</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {jobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        to={`/recruiter/jobs/${job.id}`}
                        className="flex items-center justify-between px-3 py-3 active:bg-slate-50"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="text-xs text-slate-500 tabular-nums">
                            {job.partial_postcode ?? "—"} ·{" "}
                            {job.is_published ? "Published" : "Draft"}
                          </p>
                        </div>
                        <span className="text-sm text-blue-600">Applicants →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </RecruiterShell>
  );
}
