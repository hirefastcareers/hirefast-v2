import { cn } from "@/lib/utils";

const HEIGHTS = { sm: 20, md: 28, lg: 40 } as const;
const VIEWBOX_WIDTH = 200;
const VIEWBOX_HEIGHT = 40;

type HireFastLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * HireFast wordmark: chevron + "Hire" (#f0f4ff) + "Fast" (#3b6ef5).
 * Chevron height matches cap height of text; DM Sans bold.
 */
export function HireFastLogo({ size = "md", className }: HireFastLogoProps) {
  const h = HEIGHTS[size];
  const w = (VIEWBOX_WIDTH / VIEWBOX_HEIGHT) * h;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {/* Right-pointing chevron: two strokes meeting at point (like >), cap-height tall */}
      <path
        d="M 8 10 L 24 20 L 8 30"
        fill="none"
        stroke="#3b6ef5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={32}
        y={28}
        fontFamily="'DM Sans', sans-serif"
        fontWeight={700}
        fontSize={28}
        letterSpacing="-0.02em"
      >
        <tspan fill="#f0f4ff">Hire</tspan><tspan fill="#3b6ef5">Fast</tspan>
      </text>
    </svg>
  );
}
