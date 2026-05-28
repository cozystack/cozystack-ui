import { humanizeBytes, humanizeCpu } from "../../lib/k8s-quantity.ts"
import type { ResourceTotals } from "../../lib/cluster-usage/types.ts"

export type ResourceFormat = "cpu" | "bytes" | "count"

interface ResourceCardProps {
  title: string
  format: ResourceFormat
  totals: ResourceTotals
  /**
   * When true, the Requested figure is treated as unknown (cluster-wide
   * pod read access was denied or the request failed). The numeric value
   * is replaced with an em dash and a tooltip explains why.
   */
  requestedUnavailable?: boolean
}

function formatValue(value: number, format: ResourceFormat): string {
  switch (format) {
    case "cpu":
      return humanizeCpu(value)
    case "bytes":
      return humanizeBytes(value)
    case "count":
    default:
      return value % 1 === 0 ? `${value}` : value.toFixed(2)
  }
}

function percent(value: number, allocatable: number): number | null {
  if (allocatable <= 0) return null
  return Math.min(100, Math.round((value / allocatable) * 100))
}

function barColorClass(pct: number | null): string {
  if (pct === null) return "bg-slate-300"
  if (pct > 90) return "bg-red-500"
  if (pct > 70) return "bg-amber-500"
  return "bg-blue-500"
}

interface ProgressBarProps {
  pct: number | null
  resourceBar: "requested" | "used"
  ariaLabel: string
}

function ProgressBar({ pct, resourceBar, ariaLabel }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      data-resource-bar={resourceBar}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? 0}
      className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={`h-full transition-all duration-200 ${barColorClass(pct)}`}
        style={{ width: `${pct ?? 0}%` }}
      />
    </div>
  )
}

/**
 * A single aggregate-resource card showing capacity, allocatable, and
 * up to two progress bars: requested (always rendered when allocatable
 * is non-zero) and used (rendered only when totals.used is defined,
 * which happens for cpu/memory when metrics.k8s.io is discovered).
 *
 * A zero-allocatable resource renders em dashes for every number and
 * no progress bar — that combination is rare but represents nodes that
 * have not yet reported their capacity, and crashing the panel is much
 * worse than rendering placeholders.
 */
export function ResourceCard({
  title,
  format,
  totals,
  requestedUnavailable = false,
}: ResourceCardProps) {
  const allocatableZero = totals.allocatable <= 0
  const requestedPct = percent(totals.requested, totals.allocatable)
  const usedDefined = totals.used !== undefined
  const usedPct = usedDefined ? percent(totals.used ?? 0, totals.allocatable) : null
  const REQUESTED_UNAVAILABLE_REASON = "Requires cluster-wide pod read access"

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between text-xs text-slate-500">
          <span>Capacity</span>
          <span className="tabular-nums text-slate-700">
            {allocatableZero ? "—" : formatValue(totals.capacity, format)}
          </span>
        </div>
        <div className="flex items-baseline justify-between text-xs text-slate-500">
          <span>Allocatable</span>
          <span className="tabular-nums text-slate-700">
            {allocatableZero ? "—" : formatValue(totals.allocatable, format)}
          </span>
        </div>
        {usedDefined ? (
          <div>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-slate-600">Used</span>
              <span className="tabular-nums text-slate-700">
                {allocatableZero ? "—" : formatValue(totals.used ?? 0, format)}
              </span>
            </div>
            {!allocatableZero ? (
              <ProgressBar pct={usedPct} resourceBar="used" ariaLabel={`${title} used`} />
            ) : null}
          </div>
        ) : null}
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-slate-600">Requested</span>
            <span
              className="tabular-nums text-slate-700"
              title={requestedUnavailable ? REQUESTED_UNAVAILABLE_REASON : undefined}
            >
              {requestedUnavailable || allocatableZero
                ? "—"
                : formatValue(totals.requested, format)}
            </span>
          </div>
          {!allocatableZero && !requestedUnavailable ? (
            <ProgressBar
              pct={requestedPct}
              resourceBar="requested"
              ariaLabel={`${title} requested`}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
