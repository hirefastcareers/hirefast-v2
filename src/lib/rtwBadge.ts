/**
 * Ready to Work progressive verification score (0–4).
 * Used for badge display only; all data remains self-declared unless verified.
 */

export type RtwScoreParams = {
  has_rtw: boolean | null;
  rtw_verified?: boolean | null;
  ni_confirmed?: boolean | null;
  dbs_status?: string | null;
};

/**
 * Compute RTW verification score 0–4.
 * 0 = no RTW declared
 * 1 = RTW self-declared only
 * 2 = RTW verified
 * 3 = + NI confirmed (self-declared)
 * 4 = + DBS status on file (self-declared)
 */
export function getRtwScore(p: RtwScoreParams): number {
  if (p.has_rtw !== true) return 0;
  let score = 1;
  if (p.rtw_verified === true) score = 2;
  if (p.ni_confirmed === true) score = Math.max(score, 3);
  const dbsOk =
    p.dbs_status != null &&
    String(p.dbs_status).trim().toLowerCase() !== "" &&
    String(p.dbs_status).trim().toLowerCase() !== "none";
  if (dbsOk) score = Math.max(score, 4);
  return Math.min(4, score);
}

/** Badge label for display. Always includes "(Self-declared)" for non-verified. */
export function getRtwBadgeLabel(score: number): string {
  switch (score) {
    case 0:
      return "No RTW";
    case 1:
      return "RTW (Self-declared)";
    case 2:
      return "RTW verified";
    case 3:
      return "RTW + NI (Self-declared)";
    case 4:
      return "Ready to Work · 4/4";
    default:
      return "RTW?";
  }
}

/** Tailwind-compatible badge classes: emerald when score high, amber mid, rose/neutral low. */
export function getRtwBadgeClass(score: number): string {
  if (score >= 4) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
  if (score >= 2) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
  if (score === 1) return "bg-amber-500/10 text-amber-400 border-amber-500/25";
  return "bg-[#1a2438] text-[#8494b4] border-[#1f2d47]";
}
