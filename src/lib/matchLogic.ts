/**
 * Match logic utilities — location, skills, and shift overlap.
 * Phase 1: 50% location + 50% skills.
 * Phase 2: 40% location + 30% skills + 30% shifts (when includeShiftMatch is true).
 */

/**
 * Shift pattern overlap scoring.
 * candidateAvailability and jobShifts are plain English string arrays
 * e.g. ['Early (6am-2pm)', 'Nights (10pm-6am)'].
 * Overlap is case-insensitive partial match: e.g. 'Early (6am-2pm)' matches 'Early (6am-2pm)'.
 *
 * @returns 0–100 percentage. If jobShifts is empty → 100 (no requirement).
 * If candidateAvailability is empty → 0.
 * Otherwise: (matchCount / jobShifts.length) * 100 rounded.
 */
export function calculateShiftMatch(
  candidateAvailability: string[],
  jobShifts: string[]
): number {
  if (jobShifts.length === 0) return 100;
  if (candidateAvailability.length === 0) return 0;

  const availLower = candidateAvailability.map((s) => s.toLowerCase().trim());
  let matchCount = 0;
  for (const shift of jobShifts) {
    const shiftLower = shift.toLowerCase().trim();
    const matches = availLower.some(
      (av) => av.includes(shiftLower) || shiftLower.includes(av)
    );
    if (matches) matchCount += 1;
  }
  return Math.round((matchCount / jobShifts.length) * 100);
}

export type MatchBreakdownParams = {
  commuteRiskLevel: "low" | "medium" | "high" | null;
  candidateSkills: string[];
  requiredSkills: string[];
  candidateAvailability?: string[];
  jobShifts?: string[];
  includeShiftMatch?: boolean;
};

export type MatchBreakdownResult = {
  locationScore: number;
  skillsScore: number;
  shiftScore: number;
  overallScore: number;
  breakdown: {
    locationWeight: number;
    skillsWeight: number;
    shiftWeight: number;
  };
};

/**
 * Full match breakdown — Phase 2 ready.
 * Current weights: 50% location + 50% skills.
 * Phase 2 weights: 40% location + 30% skills + 30% shifts when includeShiftMatch is true.
 */
export function getMatchBreakdown(params: MatchBreakdownParams): MatchBreakdownResult {
  const locationScore =
    params.commuteRiskLevel === "low"
      ? 100
      : params.commuteRiskLevel === "medium"
        ? 60
        : params.commuteRiskLevel === "high"
          ? 20
          : 50;

  const skillsScore =
    params.requiredSkills.length === 0
      ? 100
      : Math.round(
          (params.requiredSkills.filter((s) =>
            params.candidateSkills.includes(s)
          ).length /
            params.requiredSkills.length) *
            100
        );

  const shiftScore = params.includeShiftMatch
    ? calculateShiftMatch(
        params.candidateAvailability ?? [],
        params.jobShifts ?? []
      )
    : 100;

  const locationWeight = params.includeShiftMatch ? 40 : 50;
  const skillsWeight = params.includeShiftMatch ? 30 : 50;
  const shiftWeight = params.includeShiftMatch ? 30 : 0;

  const overallScore = Math.round(
    (locationScore * locationWeight +
      skillsScore * skillsWeight +
      shiftScore * shiftWeight) /
      100
  );

  return {
    locationScore,
    skillsScore,
    shiftScore,
    overallScore,
    breakdown: {
      locationWeight,
      skillsWeight,
      shiftWeight,
    },
  };
}
