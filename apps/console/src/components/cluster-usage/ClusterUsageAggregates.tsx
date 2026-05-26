import { ResourceCard } from "./ResourceCard.tsx"
import type { AggregateResources } from "../../lib/cluster-usage/types.ts"

interface ClusterUsageAggregatesProps {
  aggregates: AggregateResources
}

/**
 * Top panel of the Cluster Usage admin page: four fixed cards for the
 * standard scheduler resources, followed by one card per extended
 * resource discovered in node.status.capacity (alphabetical, full key
 * verbatim). The extended section disappears entirely when no extended
 * resources are present — no empty 'No GPUs found' state.
 */
export function ClusterUsageAggregates({ aggregates }: ClusterUsageAggregatesProps) {
  const extendedKeys = Object.keys(aggregates.extended).sort()
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ResourceCard title="CPU" format="cpu" totals={aggregates.standard.cpu} />
        <ResourceCard title="Memory" format="bytes" totals={aggregates.standard.memory} />
        <ResourceCard
          title="Storage"
          format="bytes"
          totals={aggregates.standard["ephemeral-storage"]}
        />
        <ResourceCard title="Pods" format="count" totals={aggregates.standard.pods} />
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
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
