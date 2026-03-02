import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  UserCheck,
  CircleDot,
  ChevronDown,
  Briefcase,
  Send,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { backfillCommuteScores } from "@/lib/commuteScoring";
import { getRtwScore } from "@/lib/rtwBadge";
import RecruiterLayout from "@/layouts/RecruiterLayout";
import { ApplicantsTable, type ApplicationRow, type JobRow } from "@/components/recruiter/ApplicantsTable";
import { CandidateSheet } from "@/components/recruiter/CandidateSheet";

const APPLICATIONS_SELECT = `
  id, job_id, employer_id, candidate_id, full_name, email, phone,
  candidate_postcode, commute_distance_miles, commute_risk_level, journey_time_mins,
  match_score, status, outcome, has_rtw, created_at, shortlisted_at, last_contacted_at,
  jobs ( id, title, location_name, sector ),
  candidates ( rtw_verified, ni_confirmed, dbs_status )
`;

type SortOption = "match" | "recent" | "name";
type RiskFilter = "all" | "low" | "medium" | "high";
type StatusFilter = "all" | "pending" | "shortlisted" | "rejected";
type RtwFilter = "all" | "4" | "3" | "2" | "1" | "0";

function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4 overflow-hidden relative"
      role="presentation"
    >
      <div className="h-5 w-32 rounded bg-[#1a2438]" />
      <div className="mt-2 h-4 w-48 rounded bg-[#1a2438]" />
      <div className="mt-3 flex flex-wrap gap-2">
        <div className="h-6 w-24 rounded-full bg-[#1a2438]" />
        <div className="h-5 w-20 rounded-full bg-[#1a2438]" />
        <div className="h-5 w-16 rounded-full bg-[#1a2438]" />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <div className="h-8 w-8 rounded-lg bg-[#1a2438]" />
        <div className="h-8 w-8 rounded-lg bg-[#1a2438]" />
      </div>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  );
}

export default function ManageApplicants() {
  const [loading, setLoading] = useState<boolean>(true);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filterJob, setFilterJob] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [filterRisk, setFilterRisk] = useState<RiskFilter>("all");
  const [filterRtw, setFilterRtw] = useState<RtwFilter>("all");
  const [filterNoResponse48, setFilterNoResponse48] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

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

      const { data: recruiterEmployer, error: lookupError } = await supabase
        .from("recruiter_employers")
        .select("employer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError || !recruiterEmployer?.employer_id) {
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setEmployerId(recruiterEmployer.employer_id);

      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, location_name, sector")
        .eq("recruiter_id", user.id)
        .eq("is_active", true);

      if (jobsError) {
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setJobs(jobsData ?? []);

      const { data: appsData, error: appsError } = await supabase
        .from("applications")
        .select(APPLICATIONS_SELECT)
        .eq("employer_id", recruiterEmployer.employer_id)
        .order("match_score", { ascending: false });

      if (appsError) {
        setLoading(false);
        return;
      }
      if (cancelled) return;
      const apps = (appsData as unknown as ApplicationRow[]) ?? [];
      setApplications(apps);
      setLoading(false);

      // Backfill unscored applications (match_score null, candidate_postcode present)
      const hasUnscored = apps.some(
        (a) => a.match_score == null && (a.candidate_postcode ?? "").trim() !== ""
      );
      if (hasUnscored && recruiterEmployer.employer_id) {
        void backfillCommuteScores(supabase, recruiterEmployer.employer_id).then(
          () => {
            if (cancelled) return;
            supabase
              .from("applications")
              .select(APPLICATIONS_SELECT)
              .eq("employer_id", recruiterEmployer.employer_id)
              .order("match_score", { ascending: false })
              .then(({ data }) => {
                if (data) setApplications(data as unknown as ApplicationRow[]);
              });
          }
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime: refetch applications when a new one is inserted for this employer
  useEffect(() => {
    if (!employerId) return;

    const channel = supabase
      .channel("applications-insert")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "applications",
          filter: `employer_id=eq.${employerId}`,
        },
        () => {
          supabase
            .from("applications")
            .select(APPLICATIONS_SELECT)
            .eq("employer_id", employerId)
            .order("match_score", { ascending: false })
            .then(({ data }) => {
              if (data) setApplications(data as unknown as ApplicationRow[]);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employerId]);

  const HRS_48_MS = 48 * 60 * 60 * 1000;
  const filteredAndSorted = applications
    .filter((a) => {
      if (filterJob !== "all" && a.job_id !== filterJob) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterRisk !== "all") {
        const level = (a.commute_risk_level ?? "").toLowerCase();
        if (filterRisk === "low" && level !== "low") return false;
        if (filterRisk === "medium" && level !== "medium") return false;
        if (filterRisk === "high" && level !== "high") return false;
      }
      if (filterRtw !== "all") {
        const score = getRtwScore({
          has_rtw: a.has_rtw,
          rtw_verified: a.candidates?.rtw_verified,
          ni_confirmed: a.candidates?.ni_confirmed,
          dbs_status: a.candidates?.dbs_status,
        });
        const min = parseInt(filterRtw, 10);
        if (min === 0 ? score !== 0 : score < min) return false;
      }
      if (filterNoResponse48) {
        if (a.status === "rejected") return false;
        const ref = a.last_contacted_at ?? a.created_at;
        if (Date.now() - new Date(ref).getTime() <= HRS_48_MS) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "match") {
        const sa = a.match_score ?? -1;
        const sb = b.match_score ?? -1;
        return sb - sa;
      }
      if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      const na = (a.full_name ?? "").toLowerCase();
      const nb = (b.full_name ?? "").toLowerCase();
      return na.localeCompare(nb);
    });

  const totalApplicants = applications.length;
  const jobCount = jobs.length;
  const strongMatches = applications.filter((a) => (a.match_score ?? 0) >= 80).length;
  const shortlistedCount = applications.filter((a) => a.status === "shortlisted").length;
  const avgMatch =
    applications.length > 0
      ? Math.round(
          applications.reduce((s, a) => s + (a.match_score ?? 0), 0) / applications.length
        )
      : 0;

  const sendBulkInterestCheck = useCallback(async () => {
    if (!employerId || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkProgress({ current: 0, total: ids.length });
    const now = new Date().toISOString();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const token = crypto.randomUUID();
      await supabase
        .from("applications")
        .update({
          interest_check_token: token,
          interest_check_sent_at: now,
          last_contacted_at: now,
        })
        .eq("id", id)
        .eq("employer_id", employerId);
      await supabase.from("application_events").insert({
        application_id: id,
        event_type: "interest_check_sent",
        message: "Interest check sent",
      });
      setBulkProgress({ current: i + 1, total: ids.length });
    }
    setSelectedIds(new Set());
    setBulkProgress(null);
    showToast(`Interest check sent to ${ids.length} applicant${ids.length === 1 ? "" : "s"}.`);
    // Refetch to update last_contacted_at in table
    const { data } = await supabase
      .from("applications")
      .select(APPLICATIONS_SELECT)
      .eq("employer_id", employerId)
      .order("match_score", { ascending: false });
    if (data) setApplications(data as unknown as ApplicationRow[]);
  }, [employerId, selectedIds, showToast]);

  const bulkShortlist = useCallback(async () => {
    if (!employerId || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const now = new Date().toISOString();
    for (const id of ids) {
      await supabase
        .from("applications")
        .update({
          status: "shortlisted",
          shortlisted_at: now,
        })
        .eq("id", id)
        .eq("employer_id", employerId);
      await supabase.from("application_events").insert({
        application_id: id,
        event_type: "shortlisted",
        message: "Shortlisted",
      });
    }
    setSelectedIds(new Set());
    showToast(`${ids.length} applicant${ids.length === 1 ? "" : "s"} shortlisted.`);
    const { data } = await supabase
      .from("applications")
      .select(APPLICATIONS_SELECT)
      .eq("employer_id", employerId)
      .order("match_score", { ascending: false });
    if (data) setApplications(data as unknown as ApplicationRow[]);
  }, [employerId, selectedIds, showToast]);

  const updateStatus = useCallback(
    async (applicationId: string, newStatus: "shortlisted" | "rejected") => {
      if (!employerId) return;
      const prev = applications.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              status: newStatus,
              shortlisted_at: newStatus === "shortlisted" ? new Date().toISOString() : a.shortlisted_at,
              outcome: newStatus === "rejected" ? "rejected" : a.outcome,
            }
          : a
      );
      setApplications(prev);

      const payload: { status: string; outcome?: string; shortlisted_at?: string } = {
        status: newStatus,
      };
      if (newStatus === "rejected") payload.outcome = "rejected";
      if (newStatus === "shortlisted") payload.shortlisted_at = new Date().toISOString();

      const { error } = await supabase
        .from("applications")
        .update(payload)
        .eq("id", applicationId)
        .eq("employer_id", employerId);

      if (error) {
        setApplications(applications);
        showToast(error.message || "Update failed. Please try again.");
      }
    },
    [applications, employerId, showToast]
  );

  const activeJobsForFilter = jobs.map((j) => ({ value: j.id, label: j.title }));

  return (
    <RecruiterLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-white"
      >
        {toast && (
          <div
            className="fixed bottom-4 left-4 right-4 z-50 rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-4 py-3 text-sm text-white shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-sm"
            role="status"
          >
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[#f0f4ff]">Applicants</h1>
            <p className="mt-1 text-sm text-[#8494b4]">
              {loading ? "…" : `${totalApplicants} applicants across ${jobCount} active jobs`}
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

        {/* Filter bar */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-3 py-2 text-sm text-white focus:border-[#3b6ef5] focus:outline-none"
            >
              <option value="all">All jobs</option>
              {activeJobsForFilter.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as StatusFilter)}
              className="rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-3 py-2 text-sm text-white focus:border-[#3b6ef5] focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as RiskFilter)}
              className="rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-3 py-2 text-sm text-white focus:border-[#3b6ef5] focus:outline-none"
            >
              <option value="all">All risk</option>
              <option value="low">Safe</option>
              <option value="medium">Warning</option>
              <option value="high">High Risk</option>
            </select>
            <select
              value={filterRtw}
              onChange={(e) => setFilterRtw(e.target.value as RtwFilter)}
              className="rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-3 py-2 text-sm text-white focus:border-[#3b6ef5] focus:outline-none"
            >
              <option value="all">RTW: All</option>
              <option value="4">RTW 4/4</option>
              <option value="3">RTW 3+</option>
              <option value="2">RTW 2+</option>
              <option value="1">RTW 1+</option>
              <option value="0">RTW 0</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-[#8494b4] cursor-pointer">
              <input
                type="checkbox"
                checked={filterNoResponse48}
                onChange={(e) => setFilterNoResponse48(e.target.checked)}
                className="h-4 w-4 rounded border-[#1f2d47] bg-[#141d2e] text-[#3b6ef5] focus:ring-[#3b6ef5]"
              />
              No response 48h
            </label>
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full appearance-none rounded-[10px] border border-[#1f2d47] bg-[#0f1522] py-2 pl-3 pr-8 text-sm text-white focus:border-[#3b6ef5] focus:outline-none sm:w-auto"
              >
                <option value="match">Match Score</option>
                <option value="recent">Most Recent</option>
                <option value="name">Name A–Z</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7fa3]" />
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
            <div className="flex items-center gap-2 text-[#8494b4]">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total Applicants</span>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums text-white">
              {loading ? "—" : totalApplicants}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
            <div className="flex items-center gap-2 text-[#8494b4]">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Strong Matches</span>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums text-white">
              {loading ? "—" : strongMatches}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
            <div className="flex items-center gap-2 text-[#8494b4]">
              <UserCheck className="h-4 w-4" />
              <span className="text-sm">Shortlisted</span>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums text-white">
              {loading ? "—" : shortlistedCount}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#3b6ef5]/30 to-transparent" />
            <div className="flex items-center gap-2 text-[#8494b4]">
              <CircleDot className="h-4 w-4" />
              <span className="text-sm">Avg Match Score</span>
            </div>
            <p className="mt-1 text-2xl font-bold tracking-tight font-mono tabular-nums text-white">
              {loading ? "—" : `${avgMatch}%`}
            </p>
          </div>
        </div>

        {/* Bulk re-engagement toolbar */}
        {!loading && (selectedIds.size > 0 || bulkProgress) && (
          <div className="mb-4 rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-4">
            {bulkProgress ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-[#8494b4] font-mono tabular-nums">
                  Sending interest check… {bulkProgress.current} / {bulkProgress.total}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#1a2438]">
                  <div
                    className="h-full rounded-full bg-[#3b6ef5] transition-all duration-300"
                    style={{
                      width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-[#8494b4]">
                  <span className="font-semibold font-mono tabular-nums text-white">{selectedIds.size}</span> selected
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-[10px] border border-[#1f2d47] bg-[#0f1522] px-3 py-2 text-sm font-medium text-[#8494b4] hover:border-[#3b6ef5] hover:text-[#3b6ef5]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={bulkShortlist}
                    className="inline-flex items-center gap-2 rounded-[10px] border border-[#3b6ef5]/50 bg-[#3b6ef5]/10 px-4 py-2 text-sm font-semibold text-[#3b6ef5] hover:bg-[#3b6ef5]/20"
                  >
                    <UserCheck className="h-4 w-4" />
                    Shortlist {selectedIds.size}
                  </button>
                  <button
                    type="button"
                    onClick={sendBulkInterestCheck}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#3b6ef5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d7ef6]"
                  >
                    <Send className="h-4 w-4" />
                    Send interest check to {selectedIds.size}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DataTable */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <ApplicantsTable
            applications={filteredAndSorted}
            onSelectApplication={setSelectedApplicationId}
            onShortlist={(id) => updateStatus(id, "shortlisted")}
            onReject={(id) => updateStatus(id, "rejected")}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}

        {/* Candidate Sheet */}
        <Sheet
          open={!!selectedApplicationId}
          onOpenChange={(open) => {
            if (!open) setSelectedApplicationId(null);
          }}
        >
          <CandidateSheet
            applicationId={selectedApplicationId}
            employerId={employerId}
            onClose={() => setSelectedApplicationId(null)}
            onShortlist={(id) => updateStatus(id, "shortlisted")}
            onReject={(id) => updateStatus(id, "rejected")}
          />
        </Sheet>
      </motion.div>
    </RecruiterLayout>
  );
}
