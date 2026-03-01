import { cn } from "@/lib/utils";

const HEIGHTS = { sm: 20, md: 28, lg: 40 } as const;
const TEXT_CLASS = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" } as const;
// Chevron path lives in 8,10 to 24,30 (width 16, height 20)
const CHEVRON_VIEWBOX = "8 10 16 20";

type HireFastLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * HireFast wordmark: chevron + "Hire" (#f0f4ff) + "Fast" (#3b6ef5).
 * Wordmark is HTML text so DM Sans renders correctly.
 */
export function HireFastLogo({ size = "md", className }: HireFastLogoProps) {
  const h = HEIGHTS[size];
  const chevronW = (16 / 20) * h;

  return (
    <div
      className={cn("flex items-center gap-[0.35em]", className)}
      aria-hidden
    >
      <svg
        width={chevronW}
        height={h}
        viewBox={CHEVRON_VIEWBOX}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M 8 10 L 24 20 L 8 30"
          fill="none"
          stroke="#3b6ef5"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className={cn("font-bold tracking-tight leading-none", TEXT_CLASS[size])}
        style={{ fontFamily: "DM Sans, sans-serif" }}
      >
        <span style={{ color: "#f0f4ff" }}>Hire</span>
        <span style={{ color: "#3b6ef5" }}>Fast</span>
      </span>
    </div>
  );
}
