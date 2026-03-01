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
      {/* Right-pointing chevron, cap-height tall, vertically centred */}
      <path
        d="M 6 10 L 6 30 L 24 20 Z"
        fill="#3b6ef5"
      />
      <text
        x={32}
        y={28}
        fontFamily="'DM Sans', sans-serif"
        fontWeight={700}
        fontSize={28}
        fill="#f0f4ff"
        letterSpacing="-0.02em"
      >
        Hire
      </text>
      <text
        x={100}
        y={28}
        fontFamily="'DM Sans', sans-serif"
        fontWeight={700}
        fontSize={28}
        fill="#3b6ef5"
        letterSpacing="-0.02em"
      >
        Fast
      </text>
    </svg>
  );
}
