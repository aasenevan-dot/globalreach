export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-label="GlobalReach logo">
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="6" ry="13" stroke="currentColor" strokeWidth="2" />
      <path d="M3 16h26" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}
