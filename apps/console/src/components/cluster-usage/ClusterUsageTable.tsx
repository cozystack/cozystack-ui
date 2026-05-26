import { humanizeBytes, humanizeCpu } from "../../lib/k8s-quantity.ts"
import type { NodeRow, ResourceTotals } from "../../lib/cluster-usage/types.ts"

interface ClusterUsageTableProps {
  rows: NodeRow[]
  extendedKeys: string[]
}

function statusLabel(row: NodeRow): string {
  if (!row.ready) return "NotReady"
  if (!row.schedulable) return "SchedulingDisabled"
  return "Ready"
}

function cpuCell(totals: ResourceTotals, ready: boolean) {
  if (!ready || totals.allocatable <= 0) {
    return (
      <div className="space-y-0.5 text-xs">
        <div className="text-slate-400">—</div>
      </div>
    )
  }
  const hasUsed = totals.used !== undefined
  return (
    <div className="space-y-0.5 text-xs">
      {hasUsed ? (
        <div className="tabular-nums text-slate-700">
          {humanizeCpu(totals.used ?? 0)} / {humanizeCpu(totals.allocatable)} used
        </div>
      ) : null}
      <div className="tabular-nums text-slate-500">
        {humanizeCpu(totals.requested)} / {humanizeCpu(totals.allocatable)} req
      </div>
    </div>
  )
}

function memoryCell(totals: ResourceTotals, ready: boolean) {
  if (!ready || totals.allocatable <= 0) {
    return (
      <div className="space-y-0.5 text-xs">
        <div className="text-slate-400">—</div>
      </div>
    )
  }
  const hasUsed = totals.used !== undefined
  return (
    <div className="space-y-0.5 text-xs">
      {hasUsed ? (
        <div className="tabular-nums text-slate-700">
          {humanizeBytes(totals.used ?? 0)} / {humanizeBytes(totals.allocatable)} used
        </div>
      ) : null}
      <div className="tabular-nums text-slate-500">
        {humanizeBytes(totals.requested)} / {humanizeBytes(totals.allocatable)} req
      </div>
    </div>
  )
}

function extendedCell(totals: ResourceTotals | undefined) {
  if (!totals) return <span className="text-slate-400">—</span>
  return (
    <div className="space-y-0.5 text-xs tabular-nums text-slate-700">
      <div>
        {totals.requested} / {totals.allocatable}
      </div>
      <div className="text-slate-400">capacity {totals.capacity}</div>
    </div>
  )
}

/**
 * Per-node table rendered below the aggregate panel. The first columns
 * are fixed (Name, Status, Roles, CPU, Memory); then one column per
 * full extended-resource key found anywhere in the cluster — the
 * column header is the resource key verbatim. Trailing column is Age.
 *
 * NotReady nodes show em dashes for CPU / Memory cells because
 * status.capacity is no longer authoritative at that point; the rest of
 * the row remains visible so operators can still see which node is in
 * trouble.
 */
export function ClusterUsageTable({ rows, extendedKeys }: ClusterUsageTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Roles</th>
            <th className="px-4 py-3">CPU</th>
            <th className="px-4 py-3">Memory</th>
            {extendedKeys.map((k) => (
              <th key={k} className="px-4 py-3 font-mono normal-case tracking-normal text-slate-600">
                {k}
              </th>
            ))}
            <th className="px-4 py-3">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.name} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.name}</td>
              <td className="px-4 py-3 align-top">
                <div className="space-y-1">
                  <div className="text-xs text-slate-700">{statusLabel(r)}</div>
                  {r.pressureConditions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {r.pressureConditions.map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {r.taints.length > 0 ? (
                    <div className="text-[11px] text-slate-500">
                      +tainted {r.taints.length}
                    </div>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3 align-top text-xs text-slate-700">
                {r.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {r.roles.map((role) => (
                      <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5">
                        {role}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3 align-top">{cpuCell(r.standard.cpu, r.ready)}</td>
              <td className="px-4 py-3 align-top">{memoryCell(r.standard.memory, r.ready)}</td>
              {extendedKeys.map((k) => (
                <td key={k} className="px-4 py-3 align-top">
                  {extendedCell(r.extended[k])}
                </td>
              ))}
              <td className="px-4 py-3 tabular-nums text-xs text-slate-500">{r.age}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
