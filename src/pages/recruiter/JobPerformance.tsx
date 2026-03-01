import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Eye,
  UserCheck,
  Percent,
  CircleDot,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import RecruiterLayout from "@/layouts/RecruiterLayout";

type JobPerfRow = {
  id: string;
  title: string;
  is_active: boolean;
  views: number;
  applications: number;
  avg_match: number | null;
};

function SkeletonRow() {
  return (
    <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4 overflow-hidden relative">
      <div className="h-5 w-48 rounded bg-[#1a2438]" />
      <div className="mt-2 flex gap-4">
        <div className="h-4 w-16 rounded bg-[#1a2438]" />
        <div className="h-4 w-16 rounded bg-[#1a2438]" />
        <div className="h-4 w-20 rounded bg-[#1a2438]" />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export default function JobPerformance() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<JobPerfRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, is_active")
        .eq("recruiter_id", user.id)
        .order("created_at", { ascending: false });

      if (jobsError || !jobsData?.length) {
        setLoading(false);
        setRows([]);
        return;
      }

      const jobIds = jobsData.map((j) => j.id);

      const [viewsRes, appsRes] = await Promise.all([
        supabase.from("job_views").select("job_id").in("job_id", jobIds),
        supabase
          .from("applications")
          .select("job_id, match_score")
          .in("job_id", jobIds),
      ]);

      if (cancelled) return;

      const viewCounts: Record<string, number> = {};
      jobIds.forEach((id) => (viewCounts[id] = 0));
      (viewsRes.data ?? []).forEach((r: { job_id: string }) => {
        viewCounts[r.job_id] = (viewCounts[r.job_id] ?? 0) + 1;
      });

      const appCounts: Record<string, number> = {};
      const matchSums: Record<string, number> = {};
      const matchCounts: Record<string, number> = {};
      jobIds.forEach((id) => {
        appCounts[id] = 0;
        matchSums[id] = 0;
        matchCounts[id] = 0;
      });
      (appsRes.data ?? []).forEach((r: { job_id: string; match_score: number | null }) => {
        appCounts[r.job_id] = (appCounts[r.job_id] ?? 0) + 1;
        if (r.match_score != null) {
          matchSums[r.job_id] += r.match_score;
          matchCounts[r.job_id] += 1;
        }
      });

      const list: JobPerfRow[] = jobsData.map((j) => ({
        id: j.id,
        title: j.title,
        is_active: j.is_active ?? true,
        views: viewCounts[j.id] ?? 0,
        applications: appCounts[j.id] ?? 0,
        avg_match:
          matchCounts[j.id] > 0
            ? Math.round(matchSums[j.id] / matchCounts[j.id])
            : null,
      }));

      setRows(list);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <RecruiterLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-white"
      >
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Job performance
            </h1>
            <p className="mt-1 text-sm text-[#8494b4]">
              Views, apply rate and average match score per job
            </p>
          </div>
          <Link
            to="/recruiter/post-job"
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#3b6ef5] hover:bg-[#4d7ef6] px-4 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Post a Job
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-12 text-center">
            <BarChart3 className="w-12 h-12 text-[#8494b4] mx-auto mb-3" />
            <p className="text-white font-medium">No jobs yet</p>
            <p className="text-sm text-[#8494b4] mt-1">
              Post a job to see performance here
            </p>
            <Link
              to="/recruiter/post-job"
              className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#3b6ef5] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Briefcase className="h-4 w-4" />
              Post a Job
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-[#1f2d47]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#1f2d47] bg-[#090d16] text-xs uppercase tracking-wider text-[#4d5f7a]">
                  <th className="p-4 font-medium">Job</th>
                  <th className="p-4 font-medium text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      Views
                    </span>
                  </th>
                  <th className="p-4 font-medium text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      Applications
                    </span>
                  </th>
                  <th className="p-4 font-medium text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <Percent className="h-3.5 w-3.5" />
                      Apply rate
                    </span>
                  </th>
                  <th className="p-4 font-medium text-right tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <CircleDot className="h-3.5 w-3.5" />
                      Avg match
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const applyRate =
                    row.views > 0
                      ? Math.round((row.applications / row.views) * 100)
                      : null;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[#1f2d47] bg-[#0f1522] hover:bg-[#141d2e] transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[#f0f4ff]">
                            {row.title}
                          </p>
                          {!row.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a2438] text-[#8494b4] border border-[#1f2d47]">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right tabular-nums text-[#f0f4ff]">
                        {row.views}
                      </td>
                      <td className="p-4 text-right tabular-nums text-[#f0f4ff]">
                        {row.applications}
                      </td>
                      <td className="p-4 text-right tabular-nums text-[#8494b4]">
                        {applyRate != null ? `${applyRate}%` : "—"}
                      </td>
                      <td className="p-4 text-right tabular-nums">
                        {row.avg_match != null ? (
                          <span
                            className={
                              row.avg_match >= 80
                                ? "text-emerald-400"
                                : row.avg_match >= 60
                                  ? "text-amber-400"
                                  : "text-[#8494b4]"
                            }
                          >
                            {row.avg_match}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </RecruiterLayout>
  );
}
