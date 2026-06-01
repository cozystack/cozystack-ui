import { ResourceCard } from "./ResourceCard.tsx"
import type { AggregateResources } from "../../lib/cluster-usage/types.ts"
import type { NodeSummary } from "../../hooks/useClusterUsageData.tsx"

interface ClusterUsageAggregatesProps {
  aggregates: AggregateResources
  /** Counts shown in the panel header — Ready / NotReady / SchedulingDisabled. */
  nodeSummary: NodeSummary
  /**
   * When true, every Requested figure is replaced with an em dash and a
   * tooltip explaining that cluster-wide pod read access is required.
   * Set by the page when the underlying pods watch failed.
   */
  podsUnavailable?: boolean
}

/**
 * Top panel of the Cluster Usage admin page. A header line shows total
 * node count broken down by Ready / NotReady / SchedulingDisabled,
 * followed by four fixed cards for the standard scheduler resources,
 * followed by one card per extended resource discovered in
 * node.status.capacity (alphabetical, full key verbatim). The extended
 * section disappears entirely when no extended resources are present.
 */
export function ClusterUsageAggregates({
  aggregates,
  nodeSummary,
  podsUnavailable = false,
}: ClusterUsageAggregatesProps) {
  const extendedKeys = Object.keys(aggregates.extended).sort()
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-slate-800">
          {nodeSummary.total} node{nodeSummary.total === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-slate-500">
          {nodeSummary.ready} Ready · {nodeSummary.notReady} NotReady ·{" "}
          {nodeSummary.schedulingDisabled} SchedulingDisabled
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResourceCard
          title="CPU"
          format="cpu"
          totals={aggregates.standard.cpu}
          requestedUnavailable={podsUnavailable}
        />
        <ResourceCard
          title="Memory"
          format="bytes"
          totals={aggregates.standard.memory}
          requestedUnavailable={podsUnavailable}
        />
        <ResourceCard
          title="Storage"
          format="bytes"
          totals={aggregates.standard["ephemeral-storage"]}
          requestedUnavailable={podsUnavailable}
        />
        <ResourceCard
          title="Pods"
          format="count"
          totals={aggregates.standard.pods}
          requestedUnavailable={podsUnavailable}
        />
      </div>
      {extendedKeys.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-700">
            Extended resources (discovered)
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {extendedKeys.map((key) => (
              <div key={key} data-extended-card={key}>
                <ResourceCard
                  title={key}
                  format="count"
                  totals={aggregates.extended[key]}
                  requestedUnavailable={podsUnavailable}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
