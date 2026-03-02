import { useState, useEffect, useCallback } from "react";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UserCheck,
  X,
  Phone,
  Send,
  Clock,
  MapPin,
  Shield,
  LayoutDashboard,
  Zap,
  Mail,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { getRtwScore, getRtwBadgeLabel, getRtwBadgeClass } from "@/lib/rtwBadge";
import MatchScoreRing from "@/components/recruiter/MatchScoreRing";

type SheetApplication = {
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
  created_at: string;
  shortlisted_at: string | null;
};

type SheetJob = {
  id: string;
  title: string;
  sector: string | null;
  required_skills: string[] | null;
};

type SheetCandidate = {
  id: string;
  dbs_status: string | null;
  ni_confirmed: boolean | null;
  rtw_verified: boolean | null;
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

function RtwBadgeInSheet({
  hasRtw,
  rtwVerified,
  niConfirmed,
  dbsStatus,
}: {
  hasRtw: boolean | null;
  rtwVerified?: boolean | null;
  niConfirmed?: boolean | null;
  dbsStatus?: string | null;
}) {
  const score = getRtwScore({
    has_rtw: hasRtw,
    rtw_verified: rtwVerified,
    ni_confirmed: niConfirmed,
    dbs_status: dbsStatus,
  });
  return (
    <Badge className={cn("border rounded-[6px]", getRtwBadgeClass(score))}>
      {getRtwBadgeLabel(score)}
    </Badge>
  );
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

function getInitials(fullName: string | null): string {
  if (!fullName?.trim()) return "?";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0]! + parts[parts.length - 1]![0]).toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
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
    <span className="inline-flex rounded-full bg-slate-500/20 px-2 py-0.5 text-xs font-medium text-slate-400">
      Unscored
    </span>
  );
}

function SheetSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-16 w-3/4 rounded bg-[#1a2438] animate-pulse" />
      <div className="h-24 w-full rounded bg-[#1a2438] animate-pulse" />
      <div className="h-32 w-full rounded bg-[#1a2438] animate-pulse" />
    </div>
  );
}

type CandidateSheetProps = {
  applicationId: string | null;
  employerId: string | null;
  onClose: () => void;
  onShortlist: (applicationId: string) => void;
  onReject: (applicationId: string) => void;
};

export function CandidateSheet({
  applicationId,
  employerId,
  onClose,
  onShortlist,
  onReject,
}: CandidateSheetProps) {
  const [application, setApplication] = useState<SheetApplication | null>(null);
  const [job, setJob] = useState<SheetJob | null>(null);
  const [candidate, setCandidate] = useState<SheetCandidate | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!applicationId || !employerId) {
      setApplication(null);
      setJob(null);
      setCandidate(null);
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setApplication(null);
    setJob(null);
    setCandidate(null);
    setEvents([]);

    async function load() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data: appData, error: appError } = await supabase
        .from("applications")
        .select("*")
        .eq("id", applicationId)
        .eq("employer_id", employerId)
        .maybeSingle();

      if (appError || !appData || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      setApplication(appData as SheetApplication);

      const { data: jobData } = await supabase
        .from("jobs")
        .select("id, title, sector, required_skills")
        .eq("id", (appData as SheetApplication).job_id)
        .eq("recruiter_id", user.id)
        .maybeSingle();
      if (!cancelled && jobData) setJob(jobData as SheetJob);

      const { data: candData } = await supabase
        .from("candidates")
        .select("id, dbs_status, ni_confirmed, rtw_verified, availability, transport_mode, postcode, phone, email")
        .eq("id", (appData as SheetApplication).candidate_id)
        .maybeSingle();
      if (!cancelled && candData) setCandidate(candData as SheetCandidate);

      const { data: eventsData } = await supabase
        .from("application_events")
        .select("id, event_type, message, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (!cancelled && eventsData) setEvents(eventsData as ApplicationEvent[]);

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId, employerId]);

  const handleShortlist = useCallback(() => {
    if (!application?.id) return;
    setApplication((a) =>
      a ? { ...a, status: "shortlisted", shortlisted_at: new Date().toISOString() } : null
    );
    onShortlist(application.id);
  }, [application, onShortlist]);

  const handleReject = useCallback(() => {
    if (!application?.id) return;
    setApplication((a) => (a ? { ...a, status: "rejected", outcome: "rejected" } : null));
    onReject(application.id);
  }, [application, onReject]);

  const recordCall = useCallback(async () => {
    if (!application?.id || !employerId) return;
    const now = new Date().toISOString();
    await supabase
      .from("applications")
      .update({ last_contacted_at: now })
      .eq("id", application.id)
      .eq("employer_id", employerId);
    await supabase.from("application_events").insert({
      application_id: application.id,
      event_type: "call_attempted",
      message: "Recruiter attempted call",
    });
    const { data } = await supabase
      .from("application_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false });
    if (data?.length) setEvents(data as ApplicationEvent[]);
  }, [application?.id, employerId]);

  const sendInterestCheck = useCallback(async () => {
    if (!application?.id || !employerId) return;
    const token = crypto.randomUUID();
    const now = new Date().toISOString();
    await supabase
      .from("applications")
      .update({ interest_check_token: token, interest_check_sent_at: now })
      .eq("id", application.id)
      .eq("employer_id", employerId);
    await supabase.from("application_events").insert({
      application_id: application.id,
      event_type: "interest_check_sent",
      message: "Interest check sent",
    });
    const { data } = await supabase
      .from("application_events")
      .select("id, event_type, message, created_at")
      .eq("application_id", application.id)
      .order("created_at", { ascending: false });
    if (data?.length) setEvents(data as ApplicationEvent[]);
  }, [application?.id, employerId]);

  const phone = (application?.phone ?? candidate?.phone ?? "").trim() || null;
  const email = application?.email ?? candidate?.email ?? null;
  const postcode = application?.candidate_postcode ?? candidate?.postcode ?? null;
  const availability = candidate?.availability ?? [];
  const requiredSkills = job?.required_skills ?? [];
  const candidateSkills = application?.candidate_skills ?? [];
  const skillsOverlap = requiredSkills.filter((s) =>
    candidateSkills.some((cs) => cs.toLowerCase() === s.toLowerCase())
  );
  const extraSkills = candidateSkills.filter(
    (s) => !requiredSkills.some((r) => r.toLowerCase() === s.toLowerCase())
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

  return (
    <SheetContent
      side="right"
      showCloseButton={false}
      className="w-full sm:max-w-2xl bg-[#0f1522] border-l border-[#1f2d47] flex flex-col p-0 overflow-hidden"
      onPointerDownOutside={onClose}
      onEscapeKeyDown={onClose}
    >
      {loading ? (
        <SheetSkeleton />
      ) : !application ? (
        <div className="p-6 text-center text-[#8494b4]">Application not found.</div>
      ) : (
        <>
          {/* 1. Sheet Header — full gradient hero */}
          <SheetHeader className="bg-gradient-to-br from-[#141d2e] via-[#0f1522] to-[#090d16] border-b border-[#1f2d47] px-6 py-5 sticky top-0 z-10 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b6ef5] to-[#2952cc] text-xl font-bold text-white ring-2 ring-[#3b6ef5]/30">
                  {getInitials(application.full_name)}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-[20px] font-semibold text-white">
                    {application.full_name ?? "Unknown"}
                  </SheetTitle>
                  <p className="text-sm text-[#8494b4] mt-0.5">{job?.title ?? "—"}</p>
                  {job?.sector && (
                    <Badge variant="outline" className="mt-2 text-xs text-[#8494b4] border-[#1f2d47]">
                      {job.sector}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <MatchScoreRing score={application.match_score} size="sm" />
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#8494b4] hover:bg-[#1a2438] hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* 2. Action buttons — 2x2 grid with Tooltips */}
            <div className="grid grid-cols-2 gap-2 px-6 pb-4 mt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-[#3b6ef5] hover:bg-[#2d5ae0] text-white w-full"
                    onClick={handleShortlist}
                    disabled={application.status === "shortlisted"}
                  >
                    <UserCheck className="h-4 w-4 mr-1.5" />
                    {application.status === "shortlisted" ? "Shortlisted ✓" : "Shortlist"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Shortlist this candidate</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-rose-600/20 text-rose-400 border border-rose-600/30 hover:bg-rose-600/30 w-full"
                    onClick={handleReject}
                    disabled={application.status === "rejected"}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reject this application</TooltipContent>
              </Tooltip>
              {phone ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      asChild
                      className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 hover:bg-emerald-600/30 w-full"
                    >
                      <a href={`tel:${phone.replace(/\s/g, "")}`} onClick={recordCall}>
                        <Phone className="h-4 w-4 mr-1.5" />
                        Call
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Call candidate</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-block w-full">
                      <Button size="sm" disabled className="bg-[#1a2438]/50 text-[#8494b4] w-full">
                        <Phone className="h-4 w-4 mr-1.5" />
                        Call
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>No phone number</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-600/30 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 w-full"
                    onClick={sendInterestCheck}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Interest Check
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send interest check</TooltipContent>
              </Tooltip>
            </div>
          </SheetHeader>

          {/* 3. Tabs — upgraded styling with icons */}
          <Tabs defaultValue="overview" className="w-full flex flex-col min-h-0 shrink-0">
            <div className="px-6 pt-3 shrink-0">
              <TabsList className="w-full bg-[#090d16] border border-[#1f2d47] rounded-[10px] p-1 h-auto">
                <TabsTrigger
                  value="overview"
                  className="rounded-[8px] text-[#8494b4] text-sm data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 flex-1"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="skills"
                  className="rounded-[8px] text-[#8494b4] text-sm data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 flex-1"
                >
                  <Zap className="h-4 w-4 mr-1.5" />
                  Skills
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-[8px] text-[#8494b4] text-sm data-[state=active]:bg-[#3b6ef5] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200 flex-1"
                >
                  <Clock className="h-4 w-4 mr-1.5" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 7. Scrollable body */}
            <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#090d16] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#1a2438]">
            <TabsContent value="overview" className="mt-0">
              {/* 4. Overview tab — card sections */}
              <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-4 mb-3">
                <div className="flex items-center divide-x divide-[#1f2d47]">
                  <div className="flex-1 pr-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-[#8494b4]">Applied</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                      {formatDate(application.created_at)}
                    </p>
                  </div>
                  <div className="flex-1 px-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-[#8494b4]">Distance</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                      {application.commute_distance_miles != null
                        ? `${application.commute_distance_miles} miles`
                        : "—"}
                    </p>
                  </div>
                  <div className="flex-1 pl-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-[#8494b4]">Journey</p>
                    <p className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                      {application.journey_time_mins != null
                        ? `${application.journey_time_mins} min`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-4 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#8494b4]" />
                    Commute Fit · {locationScore != null ? `${locationScore}%` : "—"}
                  </span>
                </div>
                {commuteScored ? (
                  <>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1a2438]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          commuteLevelForBar === "low" && "bg-emerald-500",
                          commuteLevelForBar === "medium" && "bg-amber-500",
                          commuteLevelForBar === "high" && "bg-rose-500",
                          !commuteLevelForBar && "bg-emerald-500"
                        )}
                        style={{ width: `${locationScore ?? 0}%` }}
                      />
                    </div>
                    <div className="mt-1.5">
                      <CommuteRiskPill level={application.commute_risk_level} />
                    </div>
                  </>
                ) : (
                  <div className="mt-2">
                    <CommuteRiskPill level={null} />
                  </div>
                )}
              </div>

              <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-4 mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <Shield className="h-4 w-4 text-[#8494b4]" />
                  Compliance
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#8494b4]">Ready to Work</span>
                    <RtwBadgeInSheet
                      hasRtw={application.has_rtw}
                      rtwVerified={candidate?.rtw_verified}
                      niConfirmed={candidate?.ni_confirmed}
                      dbsStatus={candidate?.dbs_status}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#8494b4]">DBS (Self-declared)</span>
                    <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20">
                      {candidate?.dbs_status ?? "—"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#8494b4]">NI (Self-declared)</span>
                    {candidate?.ni_confirmed === true ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Confirmed ✓
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">
                        —
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-4 mb-3">
                <h3 className="text-sm font-semibold text-white mb-3">Contact</h3>
                <ul className="space-y-2 text-sm">
                  {phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-[#8494b4] shrink-0" />
                      <Button variant="ghost" asChild className="h-auto p-0 text-white hover:bg-transparent hover:text-[#3b6ef5]">
                        <a href={`tel:${phone.replace(/\s/g, "")}`}>
                          {phone}
                        </a>
                      </Button>
                    </li>
                  )}
                  {email && (
                    <li className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#8494b4] shrink-0" />
                      <a href={`mailto:${email}`} className="text-[#3b6ef5] hover:underline text-white">
                        {email}
                      </a>
                    </li>
                  )}
                  {!phone && !email && (
                    <li className="flex items-center gap-2 text-[#8494b4]">No contact details</li>
                  )}
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#8494b4] shrink-0" />
                    <span className="font-mono text-sm text-white">{partialPostcode(postcode)}</span>
                  </li>
                  {availability.length > 0 && (
                    <li className="flex flex-wrap gap-1 mt-2">
                      {availability.map((a) => (
                        <Badge key={a} variant="outline" className="text-xs px-2 py-0.5 border-[#1f2d47] text-slate-300">
                          {a}
                        </Badge>
                      ))}
                    </li>
                  )}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="skills" className="mt-0">
              {/* 5. Skills tab */}
              <div className="mb-4">
                <p className="text-sm text-[#8494b4]">
                  {skillsOverlap.length} of {requiredSkills.length || 0} required skills matched
                </p>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#1a2438]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      skillsScore >= 80 && "bg-emerald-500",
                      skillsScore >= 60 && skillsScore < 80 && "bg-amber-500",
                      skillsScore < 60 && "bg-rose-500"
                    )}
                    style={{ width: `${skillsScore}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-4">
                  <h3 className="text-sm font-medium text-white mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkills.map((s) => {
                      const has = candidateSkills.some(
                        (cs) => cs.toLowerCase() === s.toLowerCase()
                      );
                      return (
                        <Badge
                          key={s}
                          className={cn(
                            "text-xs",
                            has
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          )}
                        >
                          {has ? "✓ " : "× "}{s}
                        </Badge>
                      );
                    })}
                    {requiredSkills.length === 0 && (
                      <span className="text-[#8494b4] text-sm">No requirements listed</span>
                    )}
                  </div>
                </div>
                <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-4">
                  <h3 className="text-sm font-medium text-white mb-2">Additional Skills</h3>
                  {extraSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {extraSkills.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="text-xs bg-slate-500/10 text-slate-300 border-slate-500/20"
                        >
                          Bonus · {s}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#8494b4]">None declared</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              {/* 6. History tab */}
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Inbox className="h-8 w-8 text-[#1a2438]" />
                  <p className="text-[#8494b4] text-sm mt-2">No activity logged yet</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  <div
                    className="absolute left-2 top-0 bottom-0 w-px bg-[#1f2d47]"
                    aria-hidden
                  />
                  {events.map((ev) => (
                    <div key={ev.id} className="relative mb-3">
                      <div className="absolute left-0 w-4 h-4 rounded-full bg-[#3b6ef5] border-2 border-[#0f1624] ring-2 ring-[#3b6ef5]/20 -translate-x-[7px]" />
                      <div className="bg-[#090d16] rounded-[14px] border border-[#1f2d47] p-3 ml-2">
                        <p className="text-sm font-medium text-white">{ev.event_type}</p>
                        {ev.message && (
                          <p className="text-sm text-[#8494b4] mt-0.5">{ev.message}</p>
                        )}
                        <p className="text-xs text-[#4d5f7a] tabular-nums mt-1">
                          {formatDateTime(ev.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            </div>
          </Tabs>
        </>
      )}
    </SheetContent>
  );
}
