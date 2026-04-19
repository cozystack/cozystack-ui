interface IconProps {
  className?: string
}

/**
 * Classic pail silhouette in the lucide stroke style (round caps, 2px
 * stroke, 24×24 viewBox). Lucide doesn't ship a real bucket glyph —
 * `PaintBucket` has a drip and `Container` is a shipping container — so
 * we inline this one: trapezoidal body, horizontal rim, curved wire handle.
 */
export function BucketIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Wire handle */}
      <path d="M7 7c0-3 10-3 10 0" />
      {/* Top rim */}
      <path d="M3 7h18" />
      {/* Body (trapezoid, wider at top, tapering to the bottom) */}
      <path d="M4 7 6 21h12L20 7" />
    </svg>
  )
}
