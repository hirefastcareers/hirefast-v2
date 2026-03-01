import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Building2,
  Zap,
  Truck,
  Wrench,
  ShoppingBag,
  Heart,
  Car,
  UtensilsCrossed,
  Briefcase,
  CheckCircle,
  X,
  Navigation,
  Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { calculateCommuteScore } from "@/lib/commuteScoring";
import { getMatchBreakdown } from "@/lib/matchLogic";
import { getRtwScore, getRtwBadgeLabel, getRtwBadgeClass } from "@/lib/rtwBadge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CANDIDATE_POSTCODE_KEY = "hirefast_candidate_postcode";
const CANDIDATE_AVAILABILITY_KEY = "hirefast_candidate_availability";
const JOBS_PAGE_SIZE = 20;

type SortOption = "best_match" | "nearest" | "latest";

const SECTOR_OPTIONS = [
  { label: "All Sectors", value: "all" },
  { label: "Logistics", value: "logistics" },
  { label: "Engineering", value: "engineering" },
  { label: "Retail", value: "retail" },
  { label: "Care", value: "care" },
  { label: "Driving", value: "driving" },
  { label: "Hospitality", value: "hospitality" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Best Match", value: "best_match" },
  { label: "Nearest", value: "nearest" },
  { label: "Latest", value: "latest" },
];

/** Sector icon + Tailwind classes for card icon, badge, border, gradient */
const SECTOR_CONFIG: Record<
  string,
  {
    icon: typeof Truck;
    bg: string;
    text: string;
    borderL: string;
    gradient: string;
    badge: string;
  }
> = {
  logistics: {
    icon: Truck,
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    borderL: "border-l-blue-500",
    gradient: "bg-blue-500",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  warehousing: {
    icon: Truck,
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    borderL: "border-l-blue-500",
    gradient: "bg-blue-500",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  engineering: {
    icon: Wrench,
    bg: "bg-violet-500/20",
    text: "text-violet-400",
    borderL: "border-l-violet-500",
    gradient: "bg-violet-500",
    badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  manufacturing: {
    icon: Wrench,
    bg: "bg-violet-500/20",
    text: "text-violet-400",
    borderL: "border-l-violet-500",
    gradient: "bg-violet-500",
    badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  retail: {
    icon: ShoppingBag,
    bg: "bg-pink-500/20",
    text: "text-pink-400",
    borderL: "border-l-pink-500",
    gradient: "bg-pink-500",
    badge: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
  care: {
    icon: Heart,
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    borderL: "border-l-emerald-500",
    gradient: "bg-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  driving: {
    icon: Car,
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    borderL: "border-l-amber-500",
    gradient: "bg-amber-500",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  hospitality: {
    icon: UtensilsCrossed,
    bg: "bg-orange-500/20",
    text: "text-orange-400",
    borderL: "border-l-orange-500",
    gradient: "bg-orange-500",
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
};

const DEFAULT_SECTOR = {
  icon: Building2,
  bg: "bg-[#2a3a5c]",
  text: "text-[#6b7fa3]",
  borderL: "border-l-[#2a3a5c]",
  gradient: "bg-[#2a3a5c]",
  badge: "bg-[#1a2a4a] text-[#6b7fa3] border-[#2a3a5c]",
};

function getSectorConfig(sector: string | null) {
  if (!sector?.trim()) return DEFAULT_SECTOR;
  const key = sector.toLowerCase().trim().replace(/\s*\/\s*.*$/, "").replace(/\s+/g, " ");
  const base = key.split("/")[0]?.trim() ?? key;
  return SECTOR_CONFIG[base] ?? DEFAULT_SECTOR;
}

function partialPostcode(postcode: string | null | undefined): string {
  const t = postcode?.trim();
  if (!t) return "—";
  const spaceIdx = t.indexOf(" ");
  const outward = spaceIdx >= 0 ? t.slice(0, spaceIdx) : t.slice(0, 4);
  return outward || "—";
}

type JobRow = {
  id: string;
  employer_id: string;
  title: string;
  location_name: string | null;
  postcode: string | null;
  sector: string | null;
  pay_rate: string | null;
  shift_patterns: string[] | null;
  immediate_start: boolean;
  created_at: string;
  commute_threshold_mins?: number | null;
  required_skills?: string[] | null;
  employers: { company_name: string | null } | null;
};

type JobWithCompany = JobRow;

type CandidateProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  has_rtw: boolean | null;
  rtw_verified: boolean | null;
  ni_confirmed: boolean | null;
  dbs_status: string | null;
  candidate_skills: string[] | null;
  availability: string[] | null;
  transport_mode: string | null;
};

type JobScore = {
  distanceMiles: number;
  journeyMins: number;
  riskLevel: "low" | "medium" | "high";
  skillsMatch: number;
  matchedSkills: string[];
};

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function fetchPostcodeLatLng(postcode: string): Promise<{ lat: number; lng: number } | null> {
  const cleaned = postcode.replace(/\s/g, "").toUpperCase();
  if (!cleaned) return null;
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.result?.latitude != null && data?.result?.longitude != null) {
      return { lat: data.result.latitude, lng: data.result.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

/** Client-side match score 0–100 for display (distance + shift overlap). */
function getMatchScore(
  candidatePostcode: string | null,
  candidateAvailability: string[] | null,
  jobShiftPatterns: string[] | null,
  distanceMiles: number | null
): number | null {
  if (!candidatePostcode?.trim()) return null;
  let score = 50;
  if (distanceMiles != null) {
    if (distanceMiles < 10) score += 25;
    else if (distanceMiles <= 20) score += 15;
  }
  if (candidateAvailability?.length && jobShiftPatterns?.length) {
    const jobLower = jobShiftPatterns.map((p) => p.toLowerCase());
    const hasOverlap = candidateAvailability.some((a) => {
      const key = a.toLowerCase().replace(/\s*\([^)]*\)/g, "").trim();
      if (key.includes("early") && jobLower.some((j) => j.includes("early"))) return true;
      if (key.includes("late") && jobLower.some((j) => j.includes("late"))) return true;
      if (key.includes("night") && jobLower.some((j) => j.includes("night"))) return true;
      if (key.includes("day") && jobLower.some((j) => j.includes("day"))) return true;
      if (key.includes("weekend") && jobLower.some((j) => j.includes("weekend"))) return true;
      if (key.includes("flexible") || key.includes("any")) return true;
      return jobLower.some((j) => j.includes(key) || key.includes(j));
    });
    if (hasOverlap) score += 25;
  }
  return Math.min(100, Math.max(10, score));
}

const getMatchBadgeClass = (score: number) => {
  if (score >= 80) return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
};

const getMatchBadgeLabel = (score: number) => {
  if (score >= 80) return `Strong Match · ${score}%`;
  if (score >= 60) return `Good Match · ${score}%`;
  return `Weak Match · ${score}%`;
};

function JobCardRtwPill({ candidate }: { candidate: CandidateProfile }) {
  const s = getRtwScore({
    has_rtw: candidate.has_rtw,
    rtw_verified: candidate.rtw_verified,
    ni_confirmed: candidate.ni_confirmed,
    dbs_status: candidate.dbs_status,
  });
  const label = s >= 4 ? "4/4" : s > 0 ? `${s}/4` : "—";
  const cls =
    s >= 2 ? "text-emerald-400" : s === 1 ? "text-amber-400" : "text-[#8494b4]";
  return (
    <span className={cn("text-xs flex items-center gap-1 flex-shrink-0", cls)}>
      <Shield className="w-3 h-3" />RTW {label}
    </span>
  );
}

function ApplySheetRtwBlock({
  hasRtw,
  rtwVerified,
  niConfirmed,
  dbsStatus,
}: {
  hasRtw: boolean | null;
  rtwVerified: boolean | null;
  niConfirmed: boolean | null;
  dbsStatus: string | null;
}) {
  const rtwScore = getRtwScore({
    has_rtw: hasRtw,
    rtw_verified: rtwVerified,
    ni_confirmed: niConfirmed,
    dbs_status: dbsStatus,
  });
  const rtwClass = getRtwBadgeClass(rtwScore);
  const rtwLabel = getRtwBadgeLabel(rtwScore);
  return (
    <div className={cn("flex items-center gap-2 border rounded-[10px] px-4 py-3 mb-5", rtwClass)}>
      <Shield className="w-4 h-4 shrink-0" aria-hidden />
      <div>
        <p className="text-sm font-medium">{rtwLabel}</p>
        {rtwScore > 0 && rtwScore < 4 && (
          <p className="text-[#8494b4] text-xs">Progressive verification</p>
        )}
      </div>
    </div>
  );
}

export default function JobBoard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("best_match");
  const [visibleCount, setVisibleCount] = useState(JOBS_PAGE_SIZE);

  const [applyJob, setApplyJob] = useState<JobWithCompany | null>(null);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyForm, setApplyForm] = useState<{ full_name: string; phone: string; postcode: string }>({
    full_name: "",
    phone: "",
    postcode: "",
  });

  const [candidatePostcode, setCandidatePostcode] = useState<string | null>(() =>
    localStorage.getItem(CANDIDATE_POSTCODE_KEY)
  );
  const [candidateAvailability, setCandidateAvailability] = useState<string[] | null>(() => {
    try {
      const raw = localStorage.getItem(CANDIDATE_AVAILABILITY_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  });
  const [postcodeCoords, setPostcodeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [jobCoordsCache, setJobCoordsCache] = useState<Record<string, { lat: number; lng: number }>>({});
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [jobScores, setJobScores] = useState<Record<string, JobScore>>({});

  // Fetch jobs
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: e } = await supabase
        .from("jobs")
        .select("*, employers(company_name)")
        .eq("is_active", true);

      if (e) {
        setError(e.message);
        setJobs([]);
      } else {
        setJobs((data as JobWithCompany[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Fetch candidate (avatar, apply pre-fill)
  const fetchCandidate = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setCandidate(data as CandidateProfile);
      if (data.postcode) {
        setCandidatePostcode((p) => p || (data.postcode as string));
        try {
          localStorage.setItem(CANDIDATE_POSTCODE_KEY, data.postcode as string);
        } catch {
          /* ignore */
        }
      }
      if (data.availability && Array.isArray(data.availability)) {
        setCandidateAvailability((prev) => (prev?.length ? prev : (data.availability as string[])));
        try {
          localStorage.setItem(CANDIDATE_AVAILABILITY_KEY, JSON.stringify(data.availability));
        } catch {
          /* ignore */
        }
      }
    } else {
      setCandidate(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) fetchCandidate(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) fetchCandidate(session.user.id);
      else setCandidate(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchCandidate]);

  // Truth Engine: pre-apply scoring per job when candidate is logged in with postcode
  useEffect(() => {
    if (!candidate?.postcode?.trim() || !jobs.length) return;
    let cancelled = false;
    const scoreJobs = async () => {
      const scores: Record<string, JobScore> = {};
      for (const job of jobs) {
        if (cancelled) return;
        const commute = await calculateCommuteScore({
          candidatePostcode: (candidate.postcode ?? "").trim(),
          jobPostcode: job.postcode ?? "",
          transportMode: candidate.transport_mode ?? null,
          commuteThresholdMins: job.commute_threshold_mins ?? 45,
        });
        const candidateSkills = candidate.candidate_skills ?? [];
        const requiredSkills = job.required_skills ?? [];
        const matchedSkills = requiredSkills.filter((s) => candidateSkills.includes(s));
        const skillsMatch =
          requiredSkills.length > 0
            ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
            : 100;
        if (commute) {
          scores[job.id] = { ...commute, skillsMatch, matchedSkills };
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      if (!cancelled) setJobScores(scores);
    };
    scoreJobs();
    return () => {
      cancelled = true;
    };
  }, [candidate, jobs]);

  // Candidate postcode coords
  useEffect(() => {
    const pc = candidatePostcode?.trim() ?? "";
    if (!pc) return;
    let cancelled = false;
    async function fetchCoords() {
      const coords = await fetchPostcodeLatLng(pc);
      if (!cancelled && coords) setPostcodeCoords(coords);
    }
    void fetchCoords();
    return () => {
      cancelled = true;
    };
  }, [candidatePostcode]);

  const getJobCoords = useCallback(async (postcode: string | null) => {
    if (!postcode?.trim()) return null;
    const key = postcode.replace(/\s/g, "").toUpperCase();
    if (jobCoordsCache[key]) return jobCoordsCache[key];
    const coords = await fetchPostcodeLatLng(postcode);
    if (coords) setJobCoordsCache((c) => ({ ...c, [key]: coords }));
    return coords;
  }, [jobCoordsCache]);

  useEffect(() => {
    if (!postcodeCoords) return;
    let cancelled = false;
    async function updateDistances() {
      for (const job of jobs) {
        const pc = job.postcode?.trim();
        if (!pc) continue;
        const coords = await getJobCoords(pc);
        if (cancelled || !coords || !postcodeCoords) continue;
        const miles = haversineMiles(postcodeCoords.lat, postcodeCoords.lng, coords.lat, coords.lng);
        setDistances((d) => (d[job.id] === miles ? d : { ...d, [job.id]: miles }));
      }
    }
    void updateDistances();
    return () => {
      cancelled = true;
    };
  }, [jobs, postcodeCoords, getJobCoords]);

  const filteredAndSortedJobs = useMemo(() => {
    let list = jobs.filter((job) => {
      const sectorKey = job.sector?.toLowerCase().trim().replace(/\s*\/.*$/, "").trim() ?? "";
      if (sectorFilter !== "all" && sectorKey !== sectorFilter) return false;
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const title = (job.title ?? "").toLowerCase();
        const company = (job.employers?.company_name ?? "").toLowerCase();
        const location = (job.location_name ?? "").toLowerCase();
        if (!title.includes(q) && !company.includes(q) && !location.includes(q)) return false;
      }
      return true;
    });

    const withScore = list.map((job) => ({
      job,
      distance: postcodeCoords ? distances[job.id] ?? null : null,
      score: getMatchScore(
        candidatePostcode,
        candidateAvailability,
        job.shift_patterns ?? null,
        postcodeCoords ? distances[job.id] ?? null : null
      ),
    }));

    if (sortBy === "best_match") {
      withScore.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    } else if (sortBy === "nearest") {
      withScore.sort((a, b) => {
        const da = a.distance ?? 9999;
        const db = b.distance ?? 9999;
        return da - db;
      });
    } else {
      withScore.sort((a, b) => new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime());
    }

    return withScore.map((x) => x.job);
  }, [jobs, sectorFilter, searchQuery, sortBy, candidatePostcode, candidateAvailability, postcodeCoords, distances]);

  const displayedJobs = useMemo(
    () => filteredAndSortedJobs.slice(0, visibleCount),
    [filteredAndSortedJobs, visibleCount]
  );
  const hasMore = filteredAndSortedJobs.length > visibleCount;

  const clearFilters = () => {
    setSearchQuery("");
    setSectorFilter("all");
    setSortBy("best_match");
  };

  const openApplySheet = (job: JobWithCompany) => {
    if (!candidate) {
      navigate("/candidate/register");
      return;
    }
    setApplyJob(job);
    setApplySuccess(false);
    setApplyForm({
      full_name: candidate.full_name ?? "",
      phone: candidate.phone ?? "",
      postcode: candidate.postcode ?? "",
    });
  };

  const closeApplySheet = () => {
    setApplyJob(null);
    setApplySubmitting(false);
    setApplySuccess(false);
  };

  const handleApplySubmit = async () => {
    if (!applyJob || !candidate) return;
    setApplySubmitting(true);

    const { data: newApplication, error: insertError } = await supabase
      .from("applications")
      .insert({
        job_id: applyJob.id,
        employer_id: applyJob.employer_id,
        candidate_id: candidate.id,
        full_name: applyForm.full_name.trim() || (candidate.full_name ?? ""),
        email: candidate.email ?? "",
        phone: applyForm.phone.trim() || (candidate.phone ?? null),
        candidate_postcode: (applyForm.postcode.trim() || (candidate.postcode ?? "")).trim(),
        has_rtw: candidate.has_rtw ?? false,
        candidate_skills: candidate.candidate_skills ?? null,
        status: "pending",
        interest_status: "none",
        match_score: null,
      })
      .select("id")
      .single();

    if (insertError) {
      setApplySubmitting(false);
      return;
    }

    setApplySuccess(true);
    setApplySubmitting(false);
    setAppliedJobIds((prev) => new Set([...prev, applyJob.id]));

    const candidatePostcodeUsed = (
          applyForm.postcode.trim() || (candidate.postcode ?? "")
        ).trim();
    const scoreApplication = async (applicationId: string) => {
      try {
        const { data: job } = await supabase
          .from("jobs")
          .select("postcode, commute_threshold_mins, required_skills, shift_patterns")
          .eq("id", applyJob.id)
          .single();

        if (!job || !candidatePostcodeUsed) return;

        const result = await calculateCommuteScore({
          candidatePostcode: candidatePostcodeUsed,
          jobPostcode: job.postcode ?? "",
          transportMode: candidate.transport_mode ?? null,
          commuteThresholdMins: job.commute_threshold_mins ?? 45,
        });

        if (!result) return;

        const candidateAvailability = candidate.availability ?? [];
        const jobShifts = (job.shift_patterns ?? []) as string[];
        const { overallScore } = getMatchBreakdown({
          commuteRiskLevel: result.riskLevel,
          candidateSkills: candidate.candidate_skills ?? [],
          requiredSkills: (job.required_skills ?? []) as string[],
          candidateAvailability,
          jobShifts,
          includeShiftMatch: jobShifts.length > 0,
        });

        await supabase
          .from("applications")
          .update({
            commute_distance_miles: result.distanceMiles,
            journey_time_mins: result.journeyMins,
            commute_risk_level: result.riskLevel,
            match_score: overallScore,
          })
          .eq("id", applicationId);
      } catch (err) {
        console.error("Scoring failed:", err);
      }
    };

    if (newApplication?.id) {
      void scoreApplication(newApplication.id);
    }
  };

  const selectedSectorLabel =
    sectorFilter !== "all" ? SECTOR_OPTIONS.find((o) => o.value === sectorFilter)?.label : null;

  const renderApplySheetContent = () => {
    if (!applyJob) return null;
    const sectorCfg = getSectorConfig(applyJob.sector);
    const score = jobScores[applyJob.id];
    const locationScore =
      score?.riskLevel === "low"
        ? 100
        : score?.riskLevel === "medium"
          ? 60
          : score?.riskLevel === "high"
            ? 20
            : 0;
    const overallMatch =
      score != null ? Math.round((locationScore + score.skillsMatch) / 2) : null;
    const matchBadgeClass =
      overallMatch != null ? getMatchBadgeClass(overallMatch) : "bg-white/5 text-[#6b7fa3] border-white/10";
    const matchBadgeLabel = overallMatch != null ? getMatchBadgeLabel(overallMatch) : null;
    return (
      <>
        <SheetHeader className="p-0 pb-4 mb-5 border-b border-[#1f2d47] text-left">
          <SheetTitle className="text-xl font-bold text-[#f0f4ff]">
            Apply to {applyJob.title}
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {applyJob.sector && (
              <Badge
                className={cn(
                  "text-xs px-2 py-0.5 font-normal border",
                  sectorCfg.badge
                )}
              >
                {applyJob.sector}
              </Badge>
            )}
            {applyJob.pay_rate && (
              <span className="text-sm text-white tabular-nums">{applyJob.pay_rate}</span>
            )}
            {matchBadgeLabel && (
              <Badge className={cn("text-xs px-2 py-0.5 whitespace-nowrap border", matchBadgeClass)}>
                {matchBadgeLabel}
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-amber-400 text-sm mt-4">
            <Zap className="w-4 h-4 shrink-0" aria-hidden />
            Apply in 15 seconds
          </p>
        </SheetHeader>

        <AnimatePresence mode="wait">
          {!applySuccess ? (
            <motion.div
              key="form"
              className="space-y-0"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4">
                <label htmlFor="apply-full_name" className="text-xs text-[#6b7fa3] uppercase tracking-wider mb-1.5 block">
                  Full Name
                </label>
                <Input
                  id="apply-full_name"
                  type="text"
                  value={applyForm.full_name}
                  onChange={(e) => setApplyForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-[#141d2e] border border-[#243352] rounded-[10px] px-4 py-3 text-white text-sm placeholder:text-[#6b7fa3] focus:outline-none focus:border-[#3b6ef5] transition-colors"
                  placeholder="Your full name"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="apply-phone" className="text-xs text-[#6b7fa3] uppercase tracking-wider mb-1.5 block">
                  Phone
                </label>
                <Input
                  id="apply-phone"
                  type="tel"
                  value={applyForm.phone}
                  onChange={(e) => setApplyForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-[#141d2e] border border-[#243352] rounded-[10px] px-4 py-3 text-white text-sm placeholder:text-[#6b7fa3] focus:outline-none focus:border-[#3b6ef5] transition-colors"
                  placeholder="Phone number"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="apply-postcode" className="text-xs text-[#6b7fa3] uppercase tracking-wider mb-1.5 block">
                  Postcode
                </label>
                <Input
                  id="apply-postcode"
                  type="text"
                  value={applyForm.postcode}
                  onChange={(e) => setApplyForm((f) => ({ ...f, postcode: e.target.value.toUpperCase() }))}
                  className="w-full bg-[#141d2e] border border-[#243352] rounded-[10px] px-4 py-3 text-white text-sm font-mono placeholder:text-[#6b7fa3] focus:outline-none focus:border-[#3b6ef5] transition-colors"
                  placeholder="e.g. S35 2YF"
                  maxLength={8}
                />
              </div>

              {candidate && (
                <ApplySheetRtwBlock
                  hasRtw={candidate.has_rtw}
                  rtwVerified={candidate.rtw_verified}
                  niConfirmed={candidate.ni_confirmed}
                  dbsStatus={candidate.dbs_status}
                />
              )}

              <Button
                type="button"
                className="w-full bg-[#3b6ef5] hover:bg-[#2952cc] text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200 text-base"
                onClick={handleApplySubmit}
                disabled={applySubmitting}
              >
                {applySubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 shrink-0" aria-hidden />
                    Apply Now — 15 seconds
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              className="px-4 pb-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            >
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" aria-hidden />
              <h3 className="text-white text-xl font-bold">Application Sent!</h3>
              <p className="text-[#6b7fa3] text-sm mt-2">
                We've notified the recruiter. You'll hear back within 24 hours.
              </p>
              <div className="flex flex-col gap-2 mt-6">
                <Button
                  variant="outline"
                  className="border-[#2a3a5c] text-[#6b7fa3] cursor-not-allowed"
                  disabled
                >
                  View All Applications (coming soon)
                </Button>
                <Button variant="ghost" className="text-white" onClick={closeApplySheet}>
                  Back to Jobs
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-[#090d16] w-full text-white">
      <main className="w-full pb-12">
        <div className="w-full px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <div className="mb-6 max-w-2xl mx-auto w-full">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {candidate ? "Top matches for you" : "Available Jobs"}
            </h1>
            <p className="text-[#8494b4] text-sm mt-1">
              {loading
                ? "…"
                : candidate
                  ? `${filteredAndSortedJobs.length} jobs · ranked by match, commute & skills · Apply in 15 seconds`
                  : `${filteredAndSortedJobs.length} jobs available`}
            </p>
          </div>

          <div className="flex gap-2 mb-3 max-w-2xl mx-auto w-full">
            <Input
              type="search"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 h-9 text-sm bg-[#0f1522] border border-[#1f2d47] rounded-[10px] text-white placeholder:text-[#6b7fa3]"
              aria-label="Search jobs"
            />
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-[130px] h-9 bg-[#0f1522] border border-[#1f2d47] rounded-[10px] text-white text-sm">
                <SelectValue placeholder="Sector" />
              </SelectTrigger>
              <SelectContent className="bg-[#141f33] border-[#2a3a5c]">
                {SECTOR_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-[#0f1624]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[130px] h-9 bg-[#0f1522] border border-[#1f2d47] rounded-[10px] text-white text-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent className="bg-[#141f33] border-[#2a3a5c]">
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-[#0f1624]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(sectorFilter !== "all" || searchQuery.trim()) && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-xs text-[#6b7fa3]">Filters:</span>
              {sectorFilter !== "all" && selectedSectorLabel && (
                <button
                  type="button"
                  onClick={() => setSectorFilter("all")}
                  className="flex items-center gap-1 text-xs bg-[#3b6ef5]/20 text-[#3b6ef5] border border-[#3b6ef5]/30 rounded-full px-2.5 py-0.5 hover:bg-[#3b6ef5]/30 transition-colors"
                >
                  {selectedSectorLabel}
                  <X className="w-3 h-3" aria-hidden />
                </button>
              )}
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="flex items-center gap-1 text-xs bg-[#3b6ef5]/20 text-[#3b6ef5] border border-[#3b6ef5]/30 rounded-full px-2.5 py-0.5 hover:bg-[#3b6ef5]/30 transition-colors"
                >
                  &quot;{searchQuery.trim()}&quot;
                  <X className="w-3 h-3" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSectorFilter("all");
                  setSearchQuery("");
                }}
                className="text-xs text-[#6b7fa3] hover:text-white transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          <section className="w-full py-4 px-4">
            {error && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-[14px] bg-[#0f1522] border border-[#1f2d47] h-28 overflow-hidden relative">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && filteredAndSortedJobs.length === 0 && (
              <div className="rounded-[14px] border border-[#1f2d47] bg-[#0f1522] p-10 text-center max-w-4xl mx-auto">
                <Briefcase className="w-12 h-12 text-white/20 mx-auto mb-3" aria-hidden />
                <p className="text-white font-medium">No jobs found</p>
                <p className="text-[#6b7fa3] text-sm mt-1">Try adjusting your filters</p>
                <Button variant="ghost" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            )}

            {!loading && !error && filteredAndSortedJobs.length > 0 && (
              <>
                <div className="flex flex-col gap-3 max-w-2xl mx-auto w-full">
                  {displayedJobs.map((job, index) => {
                    const sectorCfg = getSectorConfig(job.sector);
                    const SectorIcon = sectorCfg.icon;
                    const outwardCode = job.postcode ? partialPostcode(job.postcode) : "—";
                    const hasApplied = appliedJobIds.has(job.id);
                    const score = jobScores[job.id];
                    const locationScore =
                      score?.riskLevel === "low"
                        ? 100
                        : score?.riskLevel === "medium"
                          ? 60
                          : score?.riskLevel === "high"
                            ? 20
                            : 0;
                    const overallMatch =
                      score != null ? Math.round((locationScore + score.skillsMatch) / 2) : null;
                    const riskColour =
                      score?.riskLevel === "low"
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                        : score?.riskLevel === "medium"
                          ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full"
                          : score?.riskLevel === "high"
                            ? "text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full"
                            : "";

                    return (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Card className="group bg-[#0f1522] border border-[#1f2d47] rounded-[14px] transition-all duration-200 cursor-pointer hover:border-[#2a3a5c] hover:bg-[#141d2e]">
                          <CardContent className="p-4">

                            {/* ROW 1: Icon + Job info + Score ring */}
                            <div className="flex items-start gap-3">
                              <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5", sectorCfg.bg, sectorCfg.text)}>
                                <SectorIcon className="w-5 h-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-sm leading-tight">{job.title}</h3>
                                    <p className="text-[#8494b4] text-xs mt-0.5">{job.location_name ?? "—"} · {outwardCode}</p>
                                  </div>

                                  {/* Match score ring */}
                                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                                    {hasApplied ? (
                                      <span className="text-xs px-2 py-1 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-medium whitespace-nowrap">Applied ✓</span>
                                    ) : overallMatch != null ? (
                                      <div className="relative w-10 h-10 flex items-center justify-center">
                                        <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
                                          <circle cx="20" cy="20" r="16" fill="none" stroke="#1a2438" strokeWidth="3.5" />
                                          <circle
                                            cx="20" cy="20" r="16" fill="none"
                                            stroke={overallMatch >= 80 ? "#34d399" : overallMatch >= 60 ? "#fbbf24" : "#fb7185"}
                                            strokeWidth="3.5"
                                            strokeLinecap="round"
                                            strokeDasharray={`${(overallMatch / 100) * 100.53} 100.53`}
                                          />
                                        </svg>
                                        <span className="absolute text-[11px] font-semibold tabular-nums"
                                          style={{ color: overallMatch >= 80 ? "#34d399" : overallMatch >= 60 ? "#fbbf24" : "#fb7185" }}>
                                          {overallMatch}%
                                        </span>
                                      </div>
                                    ) : candidate ? (
                                      <div className="w-10 h-10 flex items-center justify-center">
                                        <Loader2 className="w-4 h-4 text-[#4d5f7a] animate-spin" />
                                      </div>
                                    ) : (
                                      <span className="text-xs px-2 py-1 rounded-[6px] bg-[#1a2438] text-[#8494b4] border border-[#1f2d47] font-medium">New</span>
                                    )}
                                  </div>
                                </div>

                                {/* Pay + sector badge */}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className="text-white font-bold text-sm tabular-nums">{job.pay_rate ?? "—"}</span>
                                  {job.immediate_start && (
                                    <span className="text-xs px-2 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-medium">⚡ Immediate</span>
                                  )}
                                  {job.sector && (
                                    <span className={cn("text-xs px-2 py-0.5 rounded-[6px] border font-medium", sectorCfg.badge)}>
                                      {job.sector}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* ROW 2: Truth Engine + Apply button */}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#1f2d47]">
                              <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                {score ? (
                                  <span className={cn("text-xs px-2.5 py-1 rounded-full border flex items-center gap-1 flex-shrink-0", riskColour)}>
                                    <Navigation className="w-3 h-3 flex-shrink-0" />
                                    {score.distanceMiles}mi · {score.journeyMins}min
                                  </span>
                                ) : candidate ? (
                                  <span className="text-xs text-[#4d5f7a] flex items-center gap-1">
                                    <Navigation className="w-3 h-3" />
                                    Calculating...
                                  </span>
                                ) : null}
                                {score && (
                                  <span className="text-xs text-[#8494b4] flex items-center gap-1 flex-shrink-0">
                                    <Zap className="w-3 h-3" />
                                    {score.matchedSkills.length}/{job.required_skills?.length ?? 0} skills
                                  </span>
                                )}
                                {candidate && (
                                  <JobCardRtwPill candidate={candidate} />
                                )}
                              </div>
                              {!hasApplied && (
                                <button
                                  type="button"
                                  className="flex-shrink-0 bg-[#3b6ef5] hover:bg-[#4d7ef6] active:scale-95 text-white text-xs font-semibold px-4 py-2 rounded-[10px] transition-all"
                                  onClick={(e) => { e.stopPropagation(); openApplySheet(job); }}
                                >
                                  Apply →
                                </button>
                              )}
                            </div>

                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center max-w-4xl mx-auto">
                    <Button
                      variant="outline"
                      className="border-white/10 text-[#6b7fa3] hover:text-white hover:border-white/20 bg-white/[0.03]"
                      onClick={() => setVisibleCount((c) => c + JOBS_PAGE_SIZE)}
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <Sheet open={!!applyJob} onOpenChange={(open) => !open && closeApplySheet()}>
        <SheetContent
          side="bottom"
          className="bg-[#0f1522] border-t border-[#1f2d47] text-white max-h-[90vh] overflow-y-auto rounded-t-[20px] px-6 pb-8"
        >
          <div className="w-9 h-1 bg-[#243352] rounded-full mx-auto mt-3 mb-6" aria-hidden />

          {renderApplySheetContent()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
