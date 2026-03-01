import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  UserCheck,
  X,
  Phone,
  Send,
  AlertCircle,
  BarChart2,
  Shield,
  Clock,
  Inbox,
  MapPin,
  Copy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import RecruiterLayout from "@/layouts/RecruiterLayout";
import MatchScoreRing from "@/components/recruiter/MatchScoreRing";

type Application = {
  id: string;
  job_id: string;
  employer_id: string;
  candidate_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  candidate_postcode: string | null;
  commute_distance_miles: number | null;
  commute_risk_level: string | null;
  journey_time_mins: number | null;
  match_score: number | null;
  status: string;
  outcome: string | null;
  has_rtw: boolean | null;
  candidate_skills: string[] | null;
  interest_check_token: string | null;
  interest_check_sent_at: string | null;
  last_contacted_at: string | null;
  shortlisted_at: string | null;
  created_at: string;
};

type Job = {
  id: string;
  title: string;
  required_skills: string[] | null;
};

type Candidate = {
  id: string;
  dbs_status: string | null;
  ni_confirmed: boolean | null;
  availability: string[] | null;
  transport_mode: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
};

type ApplicationEvent = {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${h}:${m}`;
}

function partialPostcode(postcode: string | null | undefined): string {
  if (!postcode || !postcode.trim()) return "—";
  const parts = postcode.trim().split(/\s+/);
  if (parts.length >= 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase() + "…";
  }
  return "—";
}

function CommuteRiskPill({ level }: { level: string | null }) {
  const normalized = (level ?? "").toLowerCase();
  if (normalized === "low" || normalized === "green") {
    return (
      <span className="inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
        Low Risk
      </span>
    );
  }
  if (normalized === "medium" || normalized === "amber") {
    return (
      <span className="inline-flex rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400">
        Caution
      </span>
    );
  }
  if (normalized === "high" || normalized === "red") {
    return (
      <span className="inline-flex rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-400">
        High Risk
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#1a2438] px-2 py-0.5 text-xs font-medium text-[#8494b4] border border-[#1f2d47]">
      Unscored
    </span>
  );
}

function getInitials(fullName: string | null): string {
  if (!fullName?.trim()) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

function StatusChip({ status }: { status: string }) {
  if (status === "shortlisted") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-1 text-sm font-medium text-blue-400">
        Shortlisted
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center rounded-full bg-rose-500/20 px-2.5 py-1 text-sm font-medium text-rose-400">
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#1a2438] px-2.5 py-1 text-sm text-[#8494b4] border border-[#1f2d47]">
      Pending
    </span>
  );
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 animate-pulse"
      role="presentation"
    >
      <div className="h-5 w-40 rounded bg-[#1f2d47]" />
      <div className="mt-3 h-4 w-full rounded bg-[#1f2d47]" />
      <div className="mt-3 h-4 w-3/4 rounded bg-[#1f2d47]" />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded bg-[#1f2d47]" />
      <div className="mt-2 h-4 w-32 rounded bg-[#1f2d47]" />
      <div className="mt-1 h-4 w-24 rounded bg-[#1f2d47]" />
      <div className="mt-6 flex items-center gap-4">
        <div className="h-24 w-24 rounded-full bg-[#1f2d47]" />
      </div>
    </div>
  );
}

export default function CandidateProfile() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [phoneCopied, setPhoneCopied] = useState<boolean>(false);

  const showError = useCallback((message: string) => {
    setActionError(message);
    setTimeout(() => setActionError(null), 4000);
  }, []);

  // Fetch application, job, candidate, events (scoped to recruiter's employer)
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: recruiterEmployer, error: lookupError } = await supabase
        .from("recruiter_employers")
        .select("employer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lookupError || !recruiterEmployer?.employer_id) {
        if (!cancelled) setLoading(false);
        return;
      }

      if (cancelled) return;

      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", id)
        .eq("employer_id", recruiterEmployer.employer_id)
        .maybeSingle();

      if (appError || !appData) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setApplication(appData as Application);

      const { data: jobData, error: jobError } = await supabase
        .from("jobs")
        .select("id, title, required_skills")
        .eq("id", (appData as Application).job_id)
        .eq("recruiter_id", user.id)
        .maybeSingle();

      if (!cancelled) {
        if (!jobError && jobData) setJob(jobData as Job);
      }

      const { data: candData, error: candError } = await supabase
        .from("candidates")
        .select("id, dbs_status, ni_confirmed, availability, transport_mode, postcode, phone, email")
        .eq("id", (appData as Application).candidate_id)
        .maybeSingle();

      if (!cancelled) {
        if (!candError && candData) setCandidate(candData as Candidate);
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from("application_events")
        .select("id, event_type, message, created_at")
        .eq("application_id", id)
        .order("created_at", { ascending: false });

      if (!cancelled && !eventsError && eventsData) {
        setEvents(eventsData as ApplicationEvent[]);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const shortlist = useCallback(async () => {
    if (!application || !id) return;
    const prev = { ...application, status: "shortlisted" as const, shortlisted_at: new Date().toISOString() };
    setApplication(prev);

    const { error } = await supabase
      .from("applications")
      .update({
        status: "shortlisted",
        shortlisted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("employer_id", application.employer_id);

    if (error) {
      setApplication(application);
      showError(error.message || "Update failed.");
      return;
    }

    await supabase.from("application_events").insert({
      application_id: id,
      event_type: "shortlisted",
      message: "Candidate shortlisted",
    });
    const { data: newEvents } = await supabase
      .from("application_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false });
    if (newEvents?.length) setEvents(newEvents as ApplicationEvent[]);
  }, [application, id, showError]);

  const reject = useCallback(async () => {
    if (!application || !id) return;
    const prev = { ...application, status: "rejected", outcome: "rejected" };
    setApplication(prev);

    const { error } = await supabase
      .from("applications")
      .update({ status: "rejected", outcome: "rejected" })
      .eq("id", id)
      .eq("employer_id", application.employer_id);

    if (error) {
      setApplication(application);
      showError(error.message || "Update failed.");
      return;
    }

    await supabase.from("application_events").insert({
      application_id: id,
      event_type: "rejected",
      message: "Application rejected",
    });
    const { data: newEvents } = await supabase
      .from("application_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false });
    if (newEvents?.length) setEvents(newEvents as ApplicationEvent[]);
  }, [application, id, showError]);

  const recordCall = useCallback(async () => {
    if (!application || !id) return;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("applications")
      .update({ last_contacted_at: now })
      .eq("id", id)
      .eq("employer_id", application.employer_id);

    if (error) {
      showError(error.message || "Failed to record call.");
      return;
    }

    await supabase.from("application_events").insert({
      application_id: id,
      event_type: "call_attempted",
      message: "Recruiter attempted call",
    });
    const { data: newEvents } = await supabase
      .from("application_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false });
    if (newEvents?.length) setEvents(newEvents as ApplicationEvent[]);
  }, [application, id, showError]);

  const sendInterestCheck = useCallback(async () => {
    if (!application || !id) return;
    const token = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("applications")
      .update({
        interest_check_token: token,
        interest_check_sent_at: now,
      })
      .eq("id", id)
      .eq("employer_id", application.employer_id);

    if (error) {
      showError(error.message || "Failed to save interest check.");
      return;
    }

    setApplication((a) =>
      a ? { ...a, interest_check_token: token, interest_check_sent_at: now } : null
    );

    await supabase.from("application_events").insert({
      application_id: id,
      event_type: "interest_check_sent",
      message: "Interest check sent",
    });
    const { data: newEvents } = await supabase
      .from("application_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false });
    if (newEvents?.length) setEvents(newEvents as ApplicationEvent[]);
  }, [application, id, showError]);

  const phone = (application?.phone ?? candidate?.phone ?? "").trim() || null;
  const email = application?.email ?? candidate?.email ?? null;
  const postcode = application?.candidate_postcode ?? candidate?.postcode ?? null;
  const availability = candidate?.availability ?? [];
  const transportMode = candidate?.transport_mode ?? null;

  const copyPhone = useCallback(() => {
    if (!phone) return;
    navigator.clipboard.writeText(phone.replace(/\s/g, ""));
    setPhoneCopied(true);
    setTimeout(() => setPhoneCopied(false), 2000);
  }, [phone]);

  const requiredSkills = job?.required_skills ?? [];
  const candidateSkills = application?.candidate_skills ?? [];
  const skillsOverlap = requiredSkills.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
  );
  const missingSkills = requiredSkills.filter(
    (s) => !candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
  );
  const skillsScore =
    requiredSkills.length > 0
      ? Math.round((skillsOverlap.length / requiredSkills.length) * 100)
      : 100;

  const commuteScored =
    application?.commute_distance_miles != null ||
    application?.journey_time_mins != null ||
    (application?.commute_risk_level ?? "") !== "";
  const normalizedCommuteLevel = (application?.commute_risk_level ?? "").toLowerCase();
  const commuteLevelForBar =
    normalizedCommuteLevel === "low" || normalizedCommuteLevel === "green"
      ? "low"
      : normalizedCommuteLevel === "medium" || normalizedCommuteLevel === "amber"
        ? "medium"
        : normalizedCommuteLevel === "high" || normalizedCommuteLevel === "red"
          ? "high"
          : null;
  const locationScore =
    commuteScored && application?.commute_risk_level
      ? commuteLevelForBar === "low"
        ? 100
        : commuteLevelForBar === "medium"
          ? 60
          : commuteLevelForBar === "high"
            ? 25
            : 70
      : commuteScored
        ? 70
        : null;

  if (notFound) {
    return (
      <RecruiterLayout>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-8 text-center"
        >
          <h2 className="text-xl font-semibold text-[#f0f4ff]">Application not found</h2>
          <p className="mt-2 text-sm text-[#8494b4]">
            This application may have been removed or you don’t have access.
          </p>
          <Link
            to="/recruiter/applicants"
            className="mt-6 inline-flex items-center gap-2 rounded-[14px] border border-[#1f2d47] bg-[#0f1522] px-4 py-2.5 text-sm font-medium text-[#f0f4ff] hover:bg-[#1f2d47]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Applicants
          </Link>
        </motion.div>
      </RecruiterLayout>
    );
  }

  return (
    <RecruiterLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-[#f0f4ff]"
      >
        {actionError && (
          <div
            className="fixed bottom-4 left-4 right-4 z-50 flex items-center gap-2 rounded-[10px] border border-rose-600/30 bg-[#0f1522] px-4 py-3 text-sm text-rose-400 shadow-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-sm"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        <div className="mb-6">
          <Link
            to="/recruiter/applicants"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#8494b4] hover:text-[#f0f4ff]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Applicants
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5">
                <HeroSkeleton />
              </div>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column */}
            <div className="space-y-5 lg:col-span-2">
              {/* Hero */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0 }}
                className="relative overflow-hidden rounded-[14px] border border-[#1f2d47] bg-gradient-to-r from-[#1a2a4a] to-[#0f1522] p-5 transition-colors duration-200 hover:border-[#3b6ef5]/40"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#3b6ef5]/20 text-xl font-bold text-[#3b6ef5]">
                      {getInitials(application?.full_name ?? null)}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl font-bold text-[#f0f4ff]">
                        {application?.full_name ?? "Unknown"}
                      </h1>
                      <p className="mt-1 text-sm text-[#8494b4]">
                        {job?.title ?? "—"}
                      </p>
                      <p className="mt-0.5 text-sm text-[#8494b4]">
                        Applied {application ? formatDate(application.created_at) : "—"}
                      </p>
                    </div>
                  </div>
                  <MatchScoreRing score={application?.match_score ?? null} />
                </div>
                {/* Stats strip */}
                <div className="mt-5 flex items-center divide-x divide-[#1f2d47] border-t border-[#1f2d47] pt-4">
                  <div className="flex-1 pr-4 text-center sm:text-left">
                    <p className="text-xs text-[#8494b4]">Applied</p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums text-[#f0f4ff]">
                      {application ? formatDate(application.created_at) : "—"}
                    </p>
                  </div>
                  <div className="flex-1 px-4 text-center">
                    <p className="text-xs text-[#8494b4]">Distance</p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums text-[#f0f4ff]">
                      {application?.commute_distance_miles != null
                        ? `${application.commute_distance_miles} mi`
                        : "—"}
                    </p>
                  </div>
                  <div className="flex-1 pl-4 text-center sm:text-right">
                    <p className="text-xs text-[#8494b4]">Journey</p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums text-[#f0f4ff]">
                      {application?.journey_time_mins != null
                        ? `${application.journey_time_mins} min`
                        : "—"}
                    </p>
                  </div>
                </div>
              </motion.section>

              {/* Match Breakdown */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 transition-colors duration-200 hover:border-[#3b6ef5]/40"
              >
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#f0f4ff]">
                  <BarChart2 className="h-5 w-5 text-[#8494b4]" />
                  Why this score?
                </h2>

                <div className="mt-4 space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#f0f4ff]">
                        Commute Fit · {locationScore != null ? `${locationScore}%` : "—"}
                      </span>
                      {application?.commute_distance_miles != null ||
                      application?.journey_time_mins != null ? (
                        <span className="text-xs tabular-nums text-[#8494b4]">
                          {application?.commute_distance_miles != null &&
                            `${application.commute_distance_miles} miles`}
                          {application?.commute_distance_miles != null &&
                            application?.journey_time_mins != null &&
                            " · "}
                          {application?.journey_time_mins != null &&
                            `${application.journey_time_mins} mins`}
                        </span>
                      ) : null}
                    </div>
                    {commuteScored ? (
                      <>
                        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#1f2d47]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${locationScore ?? 0}%` }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            className={cn(
                              "h-full rounded-full transition-all duration-700",
                              commuteLevelForBar === "low" && "bg-emerald-500",
                              commuteLevelForBar === "medium" && "bg-amber-500",
                              commuteLevelForBar === "high" && "bg-rose-500",
                              !commuteLevelForBar && "bg-emerald-500"
                            )}
                          />
                        </div>
                        <div className="mt-1.5">
                          <CommuteRiskPill level={application?.commute_risk_level ?? null} />
                        </div>
                      </>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <CommuteRiskPill level={null} />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-[#f0f4ff]">
                        Skills Match · {requiredSkills.length > 0 ? `${skillsScore}%` : "—"}
                      </span>
                    </div>
                    {requiredSkills.length === 0 && candidateSkills.length === 0 ? (
                      <p className="mt-2 text-sm text-[#8494b4]">No skills data available</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {skillsOverlap.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400"
                            >
                              <span aria-hidden className="text-emerald-400">✓</span>
                              {s}
                            </span>
                          ))}
                          {skillsOverlap.length === 0 && (
                            <span className="text-sm text-[#8494b4]">No matched skills</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {missingSkills.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-400"
                            >
                              <span aria-hidden className="text-rose-400">×</span>
                              Missing · {s}
                            </span>
                          ))}
                          {missingSkills.length === 0 && requiredSkills.length > 0 && (
                            <span className="text-sm text-[#8494b4]">No missing skills</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#1f2d47]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skillsScore}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          skillsScore >= 80 && "bg-emerald-500",
                          skillsScore >= 60 && skillsScore < 80 && "bg-amber-500",
                          skillsScore < 60 && "bg-rose-500"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Compliance */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.16 }}
                className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 transition-colors duration-200 hover:border-[#3b6ef5]/40"
              >
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#f0f4ff]">
                  <Shield className="h-5 w-5 text-[#8494b4]" />
                  Compliance & Eligibility
                </h2>
                <ul className="mt-4 space-y-4 text-sm">
                  <li
                    className={cn(
                      "border-l-2 pl-3",
                      application?.has_rtw === true && "border-emerald-500",
                      application?.has_rtw === false && "border-rose-500",
                      application?.has_rtw != true && application?.has_rtw != false && "border-[#1f2d47]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#8494b4]">Right to Work</span>
                      <span className="text-[#8494b4]">(Self-declared)</span>
                      {application?.has_rtw === true ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-400">
                          Confirmed ✓
                        </span>
                      ) : application?.has_rtw === false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 font-medium text-rose-400">
                          Not confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1a2438] px-2 py-0.5 text-[#8494b4] border border-[#1f2d47]">
                          Not declared
                        </span>
                      )}
                    </div>
                  </li>
                  <li
                    className={cn(
                      "border-l-2 pl-3",
                      candidate?.dbs_status ? "border-[#243352]" : "border-[#1f2d47]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#8494b4]">DBS Status</span>
                      <span className="text-[#8494b4]">(Self-declared)</span>
                      {candidate?.dbs_status ? (
                        <span className="inline-flex rounded-full bg-[#1a2438] px-2 py-0.5 text-[#f0f4ff] border border-[#1f2d47]">
                          {candidate.dbs_status}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#1a2438] px-2 py-0.5 text-[#8494b4] border border-[#1f2d47]">
                          Not provided
                        </span>
                      )}
                    </div>
                  </li>
                  <li
                    className={cn(
                      "border-l-2 pl-3",
                      candidate?.ni_confirmed === true && "border-emerald-500",
                      candidate?.ni_confirmed !== true && "border-[#1f2d47]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[#8494b4]">NI Confirmed</span>
                      <span className="text-[#8494b4]">(Self-declared)</span>
                      {candidate?.ni_confirmed === true ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 font-medium text-emerald-400">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#1a2438] px-2 py-0.5 text-[#8494b4] border border-[#1f2d47]">
                          Not confirmed
                        </span>
                      )}
                    </div>
                  </li>
                </ul>
              </motion.section>

              {/* Application History */}
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.24 }}
                className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 transition-colors duration-200 hover:border-[#3b6ef5]/40"
              >
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[#f0f4ff]">
                  <Clock className="h-5 w-5 text-[#8494b4]" />
                  Application History
                </h2>
                {events.length === 0 ? (
                  <div className="mt-4 flex flex-col items-center justify-center gap-3 py-6">
                    <Inbox className="h-10 w-10 text-[#1f2d47]" aria-hidden />
                    <p className="text-sm text-[#8494b4]">No activity logged yet</p>
                  </div>
                ) : (
                  <ul className="relative mt-4 pl-2">
                    <div
                      className="absolute left-2 top-4 bottom-4 w-px bg-[#1f2d47]"
                      aria-hidden
                    />
                    {events.map((ev) => (
                      <li key={ev.id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className="relative z-0 mt-1.5 flex h-2 w-2 flex-shrink-0 rounded-full bg-[#3b6ef5]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#f0f4ff]">{ev.event_type}</p>
                          {ev.message && (
                            <p className="mt-0.5 text-sm text-[#8494b4]">{ev.message}</p>
                          )}
                          <p className="mt-0.5 text-xs tabular-nums text-[#8494b4]">
                            {formatDateTime(ev.created_at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.section>
            </div>

            {/* Right column - sticky */}
            <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              {/* Status & actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 }}
                className={cn(
                  "rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 transition-colors duration-200 hover:border-[#3b6ef5]/40",
                  application?.status === "shortlisted" && "ring-1 ring-[#3b6ef5]/30"
                )}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#8494b4]">Status</span>
                  <StatusChip status={application?.status ?? "pending"} />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={application?.status === "shortlisted" ? undefined : shortlist}
                    disabled={application?.status === "shortlisted"}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-3 text-sm font-medium transition",
                      application?.status === "shortlisted"
                        ? "cursor-default bg-[#3b6ef5] text-[#f0f4ff] opacity-90"
                        : "bg-[#3b6ef5] text-[#f0f4ff] hover:bg-[#2d5ae0]"
                    )}
                  >
                    <UserCheck className="h-4 w-4 shrink-0" />
                    {application?.status === "shortlisted" ? "Shortlisted ✓" : "Shortlist Candidate"}
                  </button>
                  <div className="my-1 border-t border-[#1f2d47]" />
                  <p className="px-1 text-xs font-medium uppercase tracking-wider text-[#8494b4]">
                    Danger Zone
                  </p>
                  <button
                    type="button"
                    onClick={application?.status === "rejected" ? undefined : reject}
                    disabled={application?.status === "rejected"}
                    className={cn(
                      "flex w-full items-center justify-center gap-2 rounded-[14px] border border-rose-600/30 bg-rose-600/20 px-4 py-3 text-sm font-medium text-rose-400 transition",
                      application?.status === "rejected"
                        ? "cursor-default opacity-60"
                        : "hover:bg-rose-600/30"
                    )}
                  >
                    <X className="h-4 w-4 shrink-0" />
                    {application?.status === "rejected" ? "Rejected" : "Reject"}
                  </button>
                  {phone ? (
                    <a
                      href={`tel:${phone.replace(/\s/g, "")}`}
                      onClick={recordCall}
                      className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-emerald-600/30 bg-emerald-600/20 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 transition"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      Call Candidate
                    </a>
                  ) : (
                    <span className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#1f2d47] bg-[#1f2d47]/50 px-4 py-3 text-sm text-[#8494b4]">
                      <Phone className="h-4 w-4 shrink-0" />
                      Call Candidate
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={sendInterestCheck}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-amber-600/30 bg-amber-600/20 px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-600/30 transition"
                  >
                    <Send className="h-4 w-4 shrink-0" />
                    Send Interest Check
                  </button>
                </div>
              </motion.div>

              {/* Contact */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.16 }}
                className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-5 transition-colors duration-200 hover:border-[#3b6ef5]/40"
              >
                <h2 className="text-lg font-semibold text-[#f0f4ff]">Contact</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  {phone && (
                    <li className="group flex items-center gap-2">
                      <a
                        href={`tel:${phone.replace(/\s/g, "")}`}
                        className="min-w-0 flex-1 text-[#3b6ef5] hover:underline"
                      >
                        {phone}
                      </a>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            copyPhone();
                          }}
                          className="flex items-center justify-center rounded-[10px] p-1.5 text-[#8494b4] opacity-0 transition-opacity hover:bg-[#1f2d47] hover:text-[#f0f4ff] group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                          aria-label="Copy phone number"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {phoneCopied && (
                          <span
                            className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded bg-[#1f2d47] px-2 py-1 text-xs text-[#f0f4ff] whitespace-nowrap"
                            role="status"
                          >
                            Copied!
                          </span>
                        )}
                      </div>
                    </li>
                  )}
                  {email && (
                    <li>
                      <a
                        href={`mailto:${email}`}
                        className="text-[#3b6ef5] hover:underline"
                      >
                        {email}
                      </a>
                    </li>
                  )}
                  {!phone && !email && (
                    <li className="text-[#8494b4]">No contact details</li>
                  )}
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-[#8494b4]" />
                    <span className="font-mono text-sm text-[#f0f4ff]">
                      {partialPostcode(postcode)}
                    </span>
                  </li>
                  {transportMode && (
                    <li>
                      <span className="inline-flex rounded-full bg-[#1f2d47] px-2 py-0.5 text-xs text-[#f0f4ff]">
                        {transportMode}
                      </span>
                    </li>
                  )}
                </ul>
                {availability.length > 0 && (
                  <div className="mt-4 border-t border-[#1f2d47] pt-3">
                    <p className="mb-2 text-xs font-medium text-[#8494b4]">Availability</p>
                    <div className="flex flex-wrap gap-1.5">
                      {availability.map((a) => (
                        <span
                          key={a}
                          className="inline-flex rounded-full bg-[#1f2d47] px-2 py-0.5 text-xs text-[#f0f4ff]"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </RecruiterLayout>
  );
}
