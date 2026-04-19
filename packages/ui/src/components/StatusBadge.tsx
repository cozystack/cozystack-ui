import { cn } from "../lib/utils.ts"

type Tone = "ok" | "warn" | "error" | "muted" | "info"

interface StatusBadgeProps {
  tone?: Tone
  children: React.ReactNode
  className?: string
}

const toneClasses: Record<Tone, string> = {
  ok: "bg-emerald-100 text-emerald-700",
  warn: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  muted: "bg-slate-100 text-slate-600",
  info: "bg-blue-100 text-blue-700",
}

export function StatusBadge({ tone = "muted", children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
