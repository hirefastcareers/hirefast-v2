import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Calendar, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Application } from "@/types";

/** Minimal sector badge classes for applications list (matches JobBoard sector styling) */
const SECTOR_BADGE: Record<string, string> = {
  logistics: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  warehousing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  engineering: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  manufacturing: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  retail: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  care: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  driving: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  hospitality: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

function getSectorBadgeClass(sector: string | null): string {
  if (!sector?.trim()) return "bg-[#1a2438] text-[#8494b4] border-[#1f2d47]";
  const key = sector.toLowerCase().trim().split("/")[0]?.trim() ?? "";
  return SECTOR_BADGE[key] ?? "bg-[#1a2438] text-[#8494b4] border-[#1f2d47]";
}

function getStatusBadgeClass(status: string): string {
  if (status === "shortlisted")
    return "border-[#3b6ef5]/25 bg-[#3b6ef5]/10 text-[#3b6ef5]";
  if (status === "rejected")
    return "border-rose-500/25 bg-rose-500/10 text-rose-400";
  return "border-[#1f2d47] bg-[#1a2438] text-[#8494b4]";
}

function getStatusLabel(status: string): string {
  if (status === "shortlisted") return "Shortlisted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function getCommutePillClass(risk: string | null): string {
  if (risk === "low")
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
  if (risk === "medium")
    return "bg-amber-500/10 text-amber-400 border-amber-500/25";
  if (risk === "high") return "bg-rose-500/10 text-rose-400 border-rose-500/25";
  return "bg-[#1a2438] text-[#8494b4] border-[#1f2d47]";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

type JobInfo = { id: string; title: string; location_name: string | null; sector: string | null; pay_rate: string | null };
type EmployerInfo = { company_name: string | null };

export type ApplicationWithDetails = Application & {
  jobs: JobInfo | null;
  employers: EmployerInfo | null;
};

function ApplicationCard({ app }: { app: ApplicationWithDetails }) {
  const job = app.jobs;
  const employer = app.employers;
  const title = job?.title ?? "Job";
  const company = employer?.company_name ?? "—";
  const sectorClass = getSectorBadgeClass(job?.sector ?? null);
  const statusClass = getStatusBadgeClass(app.status);
  const commuteClass = getCommutePillClass(app.commute_risk_level);

  return (
    <Link
      to={`/candidate/jobs`}
      className="block rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4 text-left transition-colors active:bg-[#141d2e] min-h-[44px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[#f0f4ff] tracking-tight truncate">
            {title}
          </h3>
          <p className="text-sm text-[#8494b4] mt-0.5 truncate">{company}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {job?.sector && (
              <span
                className={cn(
                  "inline-flex items-center rounded-[6px] border px-2 py-0.5 text-xs font-normal",
                  sectorClass
                )}
              >
                {job.sector}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-[6px] border px-2 py-0.5 text-xs font-normal",
                statusClass
              )}
            >
              {getStatusLabel(app.status)}
            </span>
            {app.commute_risk_level && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs border",
                  commuteClass
                )}
              >
                {app.commute_risk_level === "low"
                  ? "Easy commute"
                  : app.commute_risk_level === "medium"
                    ? "Medium commute"
                    : "Long commute"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-[#4d5f7a]">
            {app.match_score != null && (
              <span className="font-mono tabular-nums">
                Match {app.match_score}%
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden />
              Applied {formatDate(app.created_at)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 shrink-0 text-[#4d5f7a]" aria-hidden />
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[14px] bg-[#0f1522] border border-[#1f2d47] h-32 overflow-hidden relative">
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
        aria-hidden
      />
    </div>
  );
}

export default function Applications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) navigate("/candidate/register", { replace: true });
        return;
      }

      const { data: candidateRow, error: candidateError } = await supabase
        .from("candidates")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (candidateError || !candidateRow) {
        if (!cancelled) {
          setError("Could not load your profile.");
          setLoading(false);
        }
        return;
      }

      const { data: rows, error: appError } = await supabase
        .from("applications")
        .select(
          `
          id, job_id, employer_id, status, outcome, match_score,
          commute_risk_level, commute_distance_miles, journey_time_mins, created_at,
          jobs(id, title, location_name, sector, pay_rate),
          employers(company_name)
        `
        )
        .eq("candidate_id", candidateRow.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (appError) {
        setError("Could not load your applications.");
        setLoading(false);
        return;
      }

      setApplications((rows as ApplicationWithDetails[]) ?? []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="px-4 py-6 max-w-[480px] mx-auto">
        <h1 className="text-xl font-semibold text-[#f0f4ff] tracking-tight mb-1">
          My applications
        </h1>
        <p className="text-sm text-[#8494b4] mb-6">
          Track status and commute for every application.
        </p>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-6 max-w-[480px] mx-auto">
        <h1 className="text-xl font-semibold text-[#f0f4ff] tracking-tight mb-1">
          My applications
        </h1>
        <p className="text-sm text-rose-400 mt-4">{error}</p>
        <Link
          to="/candidate/jobs"
          className="mt-4 inline-block rounded-[10px] bg-[#3b6ef5] px-4 py-3 font-semibold text-white hover:bg-[#4d7ef6] active:scale-[0.98] transition"
        >
          Browse jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 max-w-[480px] mx-auto">
      <h1 className="text-xl font-semibold text-[#f0f4ff] tracking-tight mb-1">
        My applications
      </h1>
      <p className="text-sm text-[#8494b4] mb-6">
        Track status and commute for every application.
      </p>

      {applications.length === 0 ? (
        <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-8 text-center">
          <Briefcase className="w-12 h-12 mx-auto text-[#4d5f7a] mb-4" aria-hidden />
          <h2 className="font-semibold text-[#f0f4ff] mb-2">
            No applications yet
          </h2>
          <p className="text-sm text-[#8494b4] mb-6">
            You haven't applied to any jobs. Find roles that match your location and skills.
          </p>
          <Link
            to="/candidate/jobs"
            className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] bg-[#3b6ef5] px-5 py-3 font-semibold text-white hover:bg-[#4d7ef6] active:scale-[0.98] transition"
          >
            Browse jobs
          </Link>
        </div>
      ) : (
        <ul className="space-y-3 list-none p-0 m-0">
          {applications.map((app) => (
            <li key={app.id}>
              <ApplicationCard app={app} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
