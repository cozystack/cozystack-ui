interface IconProps {
  className?: string
}

/**
 * Classic pail silhouette in the lucide stroke style (round caps, 2px
 * stroke, 24×24 viewBox). Lucide doesn't ship a real bucket glyph —
 * `PaintBucket` has a drip and `Container` is a shipping container — so
 * we inline this one.
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
      <path d="M4 8h16l-1.5 11a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 8Z" />
      <path d="M8 8a4 4 0 0 1 8 0" />
    </svg>
  )
}
