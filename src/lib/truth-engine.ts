// src/lib/truth-engine.ts
// Truth Engine scoring. Constants MUST match public.get_job_applicants() in SQL.

export type RtwStatus = "has_right_to_work" | "needs_sponsorship" | "unknown";
export type Tone = "match" | "warning" | "risk";

export const TRUTH = {
  EARTH_RADIUS_MILES: 3958.8,
  ROAD_FACTOR: 1.3, // straight-line → rough road distance
  AVG_SPEED_MPH: 25, // blended urban/suburban driving
  BUFFER_MINUTES: 5, // parking / walking
  FULL_SCORE_MILES: 3, // anything within this scores 100 for location
  DEFAULT_MAX_COMMUTE_MILES: 20,
  MIN_MAX_COMMUTE_MILES: 4,
  RISK_CAP: 25, // overall score ceiling when RTW is a hard blocker
  SKILLS_HEAVY_WEIGHT: 0.5, // engineering / manufacturing: 50% location, 50% skills
  DEFAULT_LOCATION_WEIGHT: 0.6, // other sectors: 60% location, 40% skills
} as const;

const SKILLS_HEAVY_SECTORS = new Set(["engineering", "manufacturing"]);

export interface CandidateSignal {
  lat: number | null;
  lng: number | null;
  skills: string[];
  rtwStatus: RtwStatus;
}

export interface JobSignal {
  lat: number | null;
  lng: number | null;
  requiredSkills: string[];
  sponsorshipAvailable: boolean;
  maxCommuteMiles?: number | null;
  sector?: string | null;
}

export interface MatchResult {
  overall: number | null;
  location: number | null;
  skills: number | null;
  miles: number | null;
  minutesEst: number | null;
  isPartial: boolean;
  rtw: Tone;
  tone: Tone | null;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return TRUTH.EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

export function estimateMinutes(miles: number): number {
  return Math.round(((miles * TRUTH.ROAD_FACTOR) / TRUTH.AVG_SPEED_MPH) * 60 + TRUTH.BUFFER_MINUTES);
}

export function locationScore(miles: number, maxCommuteMiles?: number | null): number {
  const max = Math.max(maxCommuteMiles ?? TRUTH.DEFAULT_MAX_COMMUTE_MILES, TRUTH.MIN_MAX_COMMUTE_MILES);
  if (miles <= TRUTH.FULL_SCORE_MILES) return 100;
  if (miles >= max) return 0;
  return Math.round((100 * (max - miles)) / (max - TRUTH.FULL_SCORE_MILES));
}

export function skillsScore(candidateSkills: string[], requiredSkills: string[]): number | null {
  if (requiredSkills.length === 0) return 100;
  if (candidateSkills.length === 0) return null; // not yet provided — don't guess
  const have = new Set(candidateSkills);
  const matched = requiredSkills.filter((s) => have.has(s)).length;
  return Math.round((100 * matched) / requiredSkills.length);
}

export function rtwTone(status: RtwStatus, sponsorshipAvailable: boolean): Tone {
  if (status === "needs_sponsorship" && !sponsorshipAvailable) return "risk";
  if (status === "unknown") return "warning";
  return "match";
}

export function scoreTone(score: number | null): Tone | null {
  if (score === null) return null;
  if (score >= 75) return "match";
  if (score >= 50) return "warning";
  return "risk";
}

export function scoreMatch(candidate: CandidateSignal, job: JobSignal): MatchResult {
  const hasPoints =
    candidate.lat !== null && candidate.lng !== null && job.lat !== null && job.lng !== null;

  const miles = hasPoints
    ? Math.round(haversineMiles(candidate.lat!, candidate.lng!, job.lat!, job.lng!) * 10) / 10
    : null;
  const location = miles === null ? null : locationScore(miles, job.maxCommuteMiles);
  const skills = skillsScore(candidate.skills, job.requiredSkills);
  const rtw = rtwTone(candidate.rtwStatus, job.sponsorshipAvailable);

  const wLoc = SKILLS_HEAVY_SECTORS.has((job.sector ?? "").toLowerCase())
    ? TRUTH.SKILLS_HEAVY_WEIGHT
    : TRUTH.DEFAULT_LOCATION_WEIGHT;

  let overall: number | null;
  if (location === null && skills === null) overall = null;
  else if (location === null) overall = skills;
  else if (skills === null) overall = location;
  else overall = Math.round(location * wLoc + skills * (1 - wLoc));

  if (overall !== null && rtw === "risk") overall = Math.min(overall, TRUTH.RISK_CAP);

  return {
    overall,
    location,
    skills,
    miles,
    minutesEst: miles === null ? null : estimateMinutes(miles),
    isPartial: location === null || skills === null,
    rtw,
    tone: scoreTone(overall),
  };
}

// Semantic colours only. -500/-600 for dots, bars and borders; -700 for text on white (WCAG AA).
export const TONE_STYLES: Record<Tone, { dot: string; text: string; badge: string }> = {
  match: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  warning: {
    dot: "bg-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  risk: {
    dot: "bg-rose-600",
    text: "text-rose-700",
    badge: "bg-rose-50 text-rose-700 border border-rose-200",
  },
};
