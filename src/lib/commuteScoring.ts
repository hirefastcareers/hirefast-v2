import type { SupabaseClient } from "@supabase/supabase-js";
import { getMatchBreakdown } from "@/lib/matchLogic";

/**
 * Postcodes.io lookup — returns lat/lng for a UK postcode.
 * Never throws; returns null if postcode invalid or request fails.
 */
export async function getPostcodeData(
  postcode: string
): Promise<{ lat: number; lng: number } | null> {
  const formatted = postcode?.replace(/\s+/g, "").toUpperCase();
  if (!formatted) return null;
  try {
    const url = `https://api.postcodes.io/postcodes/${encodeURIComponent(formatted)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (
      data?.result?.latitude != null &&
      data?.result?.longitude != null
    ) {
      return {
        lat: Number(data.result.latitude),
        lng: Number(data.result.longitude),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Haversine distance in miles between two lat/lng points.
 * Rounded to 1 decimal place.
 */
export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const SPEED_MPH: Record<string, number> = {
  car: 25,
  drive: 25,
  public_transport: 15,
  bicycle: 10,
  cycle: 10,
  walk: 3,
};

/**
 * Estimated journey time in minutes by distance and transport mode.
 * Default (unknown mode): 25 mph.
 */
export function estimateJourneyMins(
  distanceMiles: number,
  transportMode: string | null
): number {
  const mode = (transportMode ?? "").toLowerCase().trim();
  const speed = mode ? SPEED_MPH[mode] ?? 25 : 25;
  return Math.round((distanceMiles / speed) * 60);
}

/**
 * Commute risk level from journey time vs threshold.
 */
export function getCommuteRiskLevel(
  journeyMins: number,
  thresholdMins: number
): "low" | "medium" | "high" {
  if (journeyMins <= thresholdMins) return "low";
  if (journeyMins <= thresholdMins * 1.25) return "medium";
  return "high";
}

export type CommuteScoreResult = {
  distanceMiles: number;
  journeyMins: number;
  riskLevel: "low" | "medium" | "high";
};

/**
 * Calculate commute score from candidate and job postcodes.
 * Returns null if either postcode lookup fails. Never throws.
 */
export async function calculateCommuteScore(params: {
  candidatePostcode: string;
  jobPostcode: string;
  transportMode: string | null;
  commuteThresholdMins: number;
}): Promise<CommuteScoreResult | null> {
  const {
    candidatePostcode,
    jobPostcode,
    transportMode,
    commuteThresholdMins,
  } = params;

  const candidateCoords = await getPostcodeData(
    candidatePostcode?.trim() ?? ""
  );
  if (!candidateCoords) return null;

  const jobCoords = await getPostcodeData(jobPostcode?.trim() ?? "");
  if (!jobCoords) return null;

  const distanceMiles = haversineDistanceMiles(
    candidateCoords.lat,
    candidateCoords.lng,
    jobCoords.lat,
    jobCoords.lng
  );
  const journeyMins = estimateJourneyMins(distanceMiles, transportMode);
  const riskLevel = getCommuteRiskLevel(journeyMins, commuteThresholdMins);

  return { distanceMiles, journeyMins, riskLevel };
}

/**
 * Compute match_score from location (risk), skills overlap, and optionally shift match.
 * When candidateAvailability and jobShifts are provided, uses 40% location + 30% skills + 30% shifts.
 * Otherwise 50% location + 50% skills.
 */
export function computeMatchScore(
  riskLevel: "low" | "medium" | "high",
  candidateSkills: string[] | null,
  requiredSkills: string[] | null,
  candidateAvailability?: string[],
  jobShifts?: string[]
): number {
  const includeShiftMatch =
    (jobShifts?.length ?? 0) > 0;
  const result = getMatchBreakdown({
    commuteRiskLevel: riskLevel,
    candidateSkills: candidateSkills ?? [],
    requiredSkills: requiredSkills ?? [],
    candidateAvailability: candidateAvailability ?? [],
    jobShifts: jobShifts ?? [],
    includeShiftMatch,
  });
  return result.overallScore;
}

type ScoreAndUpdateParams = {
  applicationId: string;
  employerId: string;
  candidatePostcode: string;
  jobPostcode: string;
  jobRequiredSkills: string[] | null;
  jobShiftPatterns?: string[] | null;
  commuteThresholdMins: number;
  transportMode: string | null;
  candidateSkills: string[] | null;
  candidateAvailability?: string[] | null;
};

/**
 * Run commute scoring and update application row (commute fields + match_score).
 * Designed for fire-and-forget after application INSERT. Never throws.
 */
export async function scoreAndUpdateApplication(
  client: SupabaseClient,
  params: ScoreAndUpdateParams
): Promise<void> {
  try {
    const score = await calculateCommuteScore({
      candidatePostcode: params.candidatePostcode,
      jobPostcode: params.jobPostcode,
      transportMode: params.transportMode,
      commuteThresholdMins: params.commuteThresholdMins,
    });

    if (!score) return;

    const matchScore = computeMatchScore(
      score.riskLevel,
      params.candidateSkills,
      params.jobRequiredSkills,
      params.candidateAvailability ?? undefined,
      params.jobShiftPatterns ?? undefined
    );

    await client
      .from("applications")
      .update({
        commute_distance_miles: score.distanceMiles,
        journey_time_mins: score.journeyMins,
        commute_risk_level: score.riskLevel,
        match_score: matchScore,
      })
      .eq("id", params.applicationId)
      .eq("employer_id", params.employerId);
  } catch {
    // Fail silently — never break application submission
  }
}

/** One-time backfill: score applications with NULL commute_distance_miles and non-null candidate_postcode. Scoped to employer_id. */
export async function backfillCommuteScores(
  client: SupabaseClient,
  employerId: string
): Promise<void> {
  const { data: rows, error: fetchError } = await client
    .from("applications")
    .select("id, job_id, candidate_id, candidate_postcode")
    .eq("employer_id", employerId)
    .is("commute_distance_miles", null)
    .not("candidate_postcode", "is", null);

  if (fetchError || !rows?.length) return;

  for (const row of rows) {
    const { data: jobRow } = await client
      .from("jobs")
      .select("postcode, commute_threshold_mins, required_skills, shift_patterns")
      .eq("id", row.job_id)
      .eq("employer_id", employerId)
      .maybeSingle();

    const { data: candidateRow } = await client
      .from("candidates")
      .select("transport_mode, availability")
      .eq("id", row.candidate_id)
      .maybeSingle();

    const postcode = (row.candidate_postcode ?? "").trim();
    if (!postcode || !jobRow?.postcode) continue;

    const score = await calculateCommuteScore({
      candidatePostcode: postcode,
      jobPostcode: jobRow.postcode,
      transportMode: candidateRow?.transport_mode ?? null,
      commuteThresholdMins: jobRow.commute_threshold_mins ?? 45,
    });

    if (!score) continue;

    const { data: appRow } = await client
      .from("applications")
      .select("candidate_skills")
      .eq("id", row.id)
      .single();

    const matchScore = computeMatchScore(
      score.riskLevel,
      appRow?.candidate_skills ?? null,
      jobRow.required_skills ?? null,
      (candidateRow?.availability as string[] | undefined) ?? undefined,
      (jobRow.shift_patterns as string[] | undefined) ?? undefined
    );

    await client
      .from("applications")
      .update({
        commute_distance_miles: score.distanceMiles,
        journey_time_mins: score.journeyMins,
        commute_risk_level: score.riskLevel,
        match_score: matchScore,
      })
      .eq("id", row.id)
      .eq("employer_id", employerId);

    console.log(
      `Scored ${row.id}: ${score.distanceMiles}mi, ${score.journeyMins}min, ${score.riskLevel}`
    );

    await new Promise((r) => setTimeout(r, 200));
  }
}
