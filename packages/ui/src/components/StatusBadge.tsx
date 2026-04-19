import { cn } from "../lib/utils.ts"

type Tone = "ok" | "warn" | "error" | "muted" | "info"

interface StatusBadgeProps {
  tone?: Tone
  children: React.ReactNode
  className?: string
}

const toneClasses: Record<Tone, string> = {
  ok: "bg-green-50 text-green-700 border-green-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  muted: "bg-slate-50 text-slate-600 border-slate-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
}

export function StatusBadge({ tone = "muted", children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
