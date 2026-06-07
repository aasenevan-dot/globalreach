import { useId } from "react";

/**
 * The GlobalReach globe mark — globe outline + meridian + equator + core.
 *
 * `variant="gradient"` (default) strokes the mark with the brand red→teal
 * gradient. `variant="current"` falls back to `currentColor` so it can be
 * tinted by the surrounding text color.
 */
export function Logo({
  className = "",
  variant = "gradient",
}: {
  className?: string;
  variant?: "gradient" | "current";
}) {
  // Unique per instance so multiple logos on a page don't share/clip a <defs> id.
  const gid = useId();
  const stroke = variant === "gradient" ? `url(#${gid})` : "currentColor";

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      role="img"
      aria-label="GlobalReach logo"
    >
      {variant === "gradient" && (
        <defs>
          <linearGradient id={gid} x1="3" y1="3" x2="29" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ef4444" />
            <stop offset="1" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
      )}
      <circle cx="16" cy="16" r="13" stroke={stroke} strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="6" ry="13" stroke={stroke} strokeWidth="2" />
      <path d="M3 16h26" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="3" fill={stroke} />
    </svg>
  );
}
