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
      {/* Wire handle, anchored at the top corners of the body */}
      <path d="M5 7c0-4 14-4 14 0" />
      {/* Open trapezoidal body — no closing line at the top */}
      <path d="M5 7 7 21h10L19 7" />
    </svg>
  )
}
