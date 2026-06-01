import { GaugeCard, type QuotaEntry } from "../QuotaDisplay.tsx"
import { humanizeBytes, humanizeCpu } from "../../lib/k8s-quantity.ts"
import type {
  AggregateResources,
  ResourceTotals,
  StandardResourceKey,
} from "../../lib/cluster-usage/types.ts"

interface ClusterUsageGaugesProps {
  aggregates: AggregateResources
  /** When true, Requested is unknown, so the request-vs-allocatable gauges are hidden. */
  podsUnavailable?: boolean
}

const STANDARD: { key: StandardResourceKey; label: string; format: (n: number) => string }[] = [
  { key: "cpu", label: "CPU", format: humanizeCpu },
  { key: "memory", label: "Memory", format: humanizeBytes },
  { key: "ephemeral-storage", label: "Storage", format: humanizeBytes },
  { key: "pods", label: "Pods", format: (n) => String(n) },
]

/** Build a quota-style gauge entry from cluster totals (requested vs allocatable). */
function entryFrom(
  label: string,
  totals: ResourceTotals | undefined,
  format: (n: number) => string,
): QuotaEntry | null {
  if (!totals || totals.allocatable <= 0) return null
  const usedNum = totals.requested
  const hardNum = totals.allocatable
  const pctReal = (usedNum / hardNum) * 100
  return {
    label,
    usedRaw: String(usedNum),
    hardRaw: String(hardNum),
    usedNum,
    hardNum,
    pct: Math.min(100, pctReal),
    pctReal,
    display: `${format(usedNum)} / ${format(hardNum)}`,
  }
}

/**
 * Cluster-wide allocation gauges: one ring per resource showing Requested vs
 * Allocatable, reusing the quota GaugeCard so it matches the per-tenant quota
 * rings. Hidden entirely when the cluster-wide pods list is unavailable
 * (Requested would be unknown and every ring would read 0%).
 */
export function ClusterUsageGauges({
  aggregates,
  podsUnavailable = false,
}: ClusterUsageGaugesProps) {
  if (podsUnavailable) return null

  const extendedKeys = Object.keys(aggregates.extended).sort()
  const entries: QuotaEntry[] = [
    ...STANDARD.map((s) => entryFrom(s.label, aggregates.standard[s.key], s.format)),
    ...extendedKeys.map((k) => entryFrom(k, aggregates.extended[k], (n) => String(n))),
  ].filter((e): e is QuotaEntry => e !== null)

  if (entries.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {entries.map((entry, i) => (
        <GaugeCard key={entry.label} entry={entry} index={i} />
      ))}
    </div>
  )
}
