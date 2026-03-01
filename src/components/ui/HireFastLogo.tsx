import { cn } from "@/lib/utils";

const TEXT_CLASS = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" } as const;

type HireFastLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * HireFast wordmark: chevron + "Hire" (#f0f4ff) + "Fast" (#3b6ef5).
 * Wordmark is HTML text so DM Sans renders correctly.
 */
export function HireFastLogo({ size = "md", className }: HireFastLogoProps) {
  return (
    <div
      className={cn("flex items-center gap-[0.35em]", className)}
      aria-hidden
    >
      <svg
        viewBox="0 0 10 16"
        height="0.85em"
        width="auto"
        fill="none"
        stroke="#3b6ef5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <polyline points="2,1 9,8 2,15" />
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
