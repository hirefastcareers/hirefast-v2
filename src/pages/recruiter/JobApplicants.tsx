import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import RecruiterShell from "@/layouts/RecruiterShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/lib/supabase";
import { daysSince, formatDate, formatMiles, formatMinutesEst } from "@/lib/format";
import { TONE_STYLES, type Tone } from "@/lib/truth-engine";
import type { JobApplicantRow } from "@/types";
import { cn } from "@/lib/utils";

type LoadState = "loading" | "ready" | "error";

export default function JobApplicants() {
  const { id: jobId } = useParams<{ id: string }>();
  const { loading: orgLoading, isRecruiter, employerId } = useOrg();
  const [rows, setRows] = useState<JobApplicantRow[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobOwned, setJobOwned] = useState(true);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId || !employerId) return;
    setState("loading");
    setError(null);
    try {
      const { data: job, error: jobError } = await supabase
        .from("jobs")
        .select("id, title, employer_id")
        .eq("id", jobId)
        .eq("employer_id", employerId)
        .maybeSingle();
      if (jobError) throw jobError;
      if (!job) {
        setJobOwned(false);
        setRows([]);
        setState("ready");
        return;
      }
      setJobOwned(true);
      setJobTitle(job.title);

      const { data, error: rpcError } = await supabase.rpc("get_job_applicants", {
        p_job_id: jobId,
      });
      if (rpcError) throw rpcError;
      setRows((data ?? []) as JobApplicantRow[]);
      setState("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load applicants.");
      setState("error");
    }
  }, [jobId, employerId]);

  useEffect(() => {
    if (employerId && jobId) void load();
  }, [employerId, jobId, load]);

  async function setStatus(applicationId: string, status: string) {
    if (!employerId) return;
    const prev = rows;
    setRows((r) =>
      r.map((row) =>
        row.application_id === applicationId
          ? { ...row, status, status_updated_at: new Date().toISOString() }
          : row,
      ),
    );
    const { error: updError } = await supabase
      .from("applications")
      .update({ status })
      .eq("id", applicationId);
    if (updError) {
      setRows(prev);
      setError(updError.message);
    }
  }

  async function markViewed(row: JobApplicantRow) {
    if (row.status !== "applied") return;
    await setStatus(row.application_id, "viewed");
  }

  if (!orgLoading && !isRecruiter) {
    return <Navigate to="/recruiter/login" replace />;
  }

  return (
    <RecruiterShell>
      <div className="space-y-4">
        <div>
          <Link to="/recruiter" className="text-sm text-blue-600">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-[26px] font-bold tracking-tight text-slate-900">
            {jobTitle || "Applicants"}
          </h1>
          <p className="text-sm text-slate-500">
            Scores from the server — not editable on the client.
          </p>
        </div>

        {state === "loading" && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
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

        {state === "ready" && !jobOwned && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="font-semibold text-rose-800">Job not found for this organisation</p>
            <p className="mt-1 text-sm text-rose-700">
              Cross-org access is blocked by RLS and the employer_id filter.
            </p>
            <Button asChild size="lg" className="mt-4 rounded-xl">
              <Link to="/recruiter">Back</Link>
            </Button>
          </div>
        )}

        {state === "ready" && jobOwned && rows.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-semibold">No applicants yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Share your job link — candidates apply in three fields.
            </p>
          </div>
        )}

        {state === "ready" && jobOwned && rows.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 md:sticky md:top-0 md:grid md:grid-cols-12 md:gap-2">
              <span className="col-span-3">Name</span>
              <span className="col-span-2">Location</span>
              <span className="col-span-2">Match</span>
              <span className="col-span-1">RTW</span>
              <span className="col-span-2">Status</span>
              <span className="col-span-2">Actions</span>
            </div>
            <ul className="divide-y divide-slate-200">
              {rows.map((row) => {
                const tone = (row.rtw_flag as Tone) || "warning";
                const scoreTone: Tone | null =
                  row.overall_score == null
                    ? null
                    : row.overall_score >= 75
                      ? "match"
                      : row.overall_score >= 50
                        ? "warning"
                        : "risk";
                const waiting = daysSince(row.status_updated_at || row.applied_at);
                return (
                  <li
                    key={row.application_id}
                    className="px-3 py-3 md:grid md:grid-cols-12 md:items-center md:gap-2"
                    onClick={() => void markViewed(row)}
                  >
                    <div className="md:col-span-3">
                      <p className="font-medium text-slate-900">{row.full_name ?? "—"}</p>
                      {row.phone && (
                        <a
                          href={`tel:${row.phone}`}
                          className="text-sm text-blue-600 tabular-nums"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {row.phone}
                        </a>
                      )}
                      <p className="text-xs text-slate-500">
                        Applied {formatDate(row.applied_at)} ·{" "}
                        <span className="tabular-nums">{waiting}</span>d waiting
                      </p>
                    </div>
                    <div className="mt-2 text-sm text-slate-600 md:col-span-2 md:mt-0">
                      <span className="tabular-nums">{row.partial_postcode ?? "—"}</span>
                      {row.commute_miles != null && (
                        <p className="text-xs tabular-nums">
                          {formatMiles(Number(row.commute_miles))} ·{" "}
                          {formatMinutesEst(row.commute_minutes_est)}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 md:col-span-2 md:mt-0">
                      {row.overall_score != null && scoreTone ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums",
                            TONE_STYLES[scoreTone].badge,
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", TONE_STYLES[scoreTone].dot)} />
                          {row.overall_score}%
                          {row.is_partial ? " partial" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </div>
                    <div className="mt-2 md:col-span-1 md:mt-0">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-medium",
                          TONE_STYLES[tone]?.badge ?? TONE_STYLES.warning.badge,
                        )}
                      >
                        {row.rtw_flag}
                      </span>
                    </div>
                    <div className="mt-2 text-sm capitalize text-slate-700 md:col-span-2 md:mt-0">
                      {row.status}
                    </div>
                    <div
                      className="mt-2 flex flex-wrap gap-1.5 md:col-span-2 md:mt-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 rounded-xl"
                        onClick={() => void setStatus(row.application_id, "shortlisted")}
                      >
                        Shortlist
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 rounded-xl"
                        onClick={() => void setStatus(row.application_id, "interview")}
                      >
                        Interview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-11 rounded-xl text-rose-700"
                        onClick={() => void setStatus(row.application_id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </RecruiterShell>
  );
}
