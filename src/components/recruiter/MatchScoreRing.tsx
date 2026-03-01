import { motion } from "framer-motion";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ~326.73

type MatchScoreRingProps = {
  score: number | null;
  size?: "default" | "sm";
};

function getStrokeColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#e11d48";
}

function getGlowFilter(score: number): string {
  if (score >= 80) return "drop-shadow(0 0 8px rgba(16,185,129,0.5))";
  if (score >= 60) return "drop-shadow(0 0 8px rgba(245,158,11,0.5))";
  return "drop-shadow(0 0 8px rgba(225,29,72,0.5))";
}

function getLabel(score: number): string {
  if (score >= 80) return "Strong Match";
  if (score >= 60) return "Good Match";
  return "Weak Match";
}

function getLabelClass(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-rose-400";
}

export default function MatchScoreRing({ score, size = "default" }: MatchScoreRingProps) {
  const isSm = size === "sm";
  const sizeClass = isSm ? "h-10 w-10" : "h-32 w-32";
  const textSizeClass = isSm ? "text-xs" : "text-2xl";
  const labelClass = isSm ? "hidden" : "text-xs font-medium";

  if (score === null) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`relative flex-shrink-0 ${sizeClass}`}>
          <svg
            viewBox="0 0 120 120"
            className={sizeClass}
            aria-hidden
          >
            <circle
              cx={60}
              cy={60}
              r={RADIUS}
              strokeWidth={8}
              stroke="#1a2438"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono font-bold tabular-nums text-[#8494b4] ${isSm ? "text-[10px]" : "text-2xl"}`}>—</span>
            {!isSm && <span className="text-xs font-medium text-[#4d5f7a]">Unscored</span>}
          </div>
        </div>
      </div>
    );
  }

  const strokeColor = getStrokeColor(score);
  const dashOffset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative flex-shrink-0 ${sizeClass}`}>
        <svg
          viewBox="0 0 120 120"
          className={sizeClass}
          style={{ filter: getGlowFilter(score) }}
          aria-hidden
        >
          <circle
            cx={60}
            cy={60}
            r={RADIUS}
            strokeWidth={8}
            stroke="#1a2438"
            fill="none"
          />
          <g transform="rotate(-90 60 60)">
            <motion.circle
              cx={60}
              cy={60}
              r={RADIUS}
              strokeWidth={8}
              stroke={strokeColor}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className={`font-mono font-bold tabular-nums text-white ${textSizeClass}`}>
              {score}
            </span>
            {!isSm && <span className="text-sm text-white">%</span>}
          </div>
          <span className={`${labelClass} ${getLabelClass(score)}`}>
            {getLabel(score)}
          </span>
        </div>
      </div>
    </div>
  );
}
