import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { humanizeBytes, humanizeCpu } from "../../lib/k8s-quantity.ts"
import type { NodeRow, ResourceTotals } from "../../lib/cluster-usage/types.ts"

interface ClusterUsageTableProps {
  rows: NodeRow[]
  extendedKeys: string[]
  /** True when pods-list cluster-wide failed — Requested cells become em dashes with a tooltip. */
  podsUnavailable?: boolean
}

const REQUESTED_UNAVAILABLE_REASON = "Requires cluster-wide pod read access"

type SortColumn = "name" | "status" | "roles" | "cpu" | "memory" | "age" | string

interface SortState {
  column: SortColumn
  direction: "asc" | "desc"
}

function statusLabel(row: NodeRow): string {
  if (!row.ready) return "NotReady"
  if (!row.schedulable) return "SchedulingDisabled"
  return "Ready"
}

function requestedPct(totals: ResourceTotals): number {
  if (totals.allocatable <= 0) return 0
  return totals.requested / totals.allocatable
}

function cpuCell(totals: ResourceTotals, ready: boolean, podsUnavailable: boolean) {
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
      {podsUnavailable ? (
        <div className="text-slate-400" title={REQUESTED_UNAVAILABLE_REASON}>
          — req
        </div>
      ) : (
        <div className="tabular-nums text-slate-500">
          {humanizeCpu(totals.requested)} / {humanizeCpu(totals.allocatable)} req
        </div>
      )}
    </div>
  )
}

function memoryCell(totals: ResourceTotals, ready: boolean, podsUnavailable: boolean) {
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
      {podsUnavailable ? (
        <div className="text-slate-400" title={REQUESTED_UNAVAILABLE_REASON}>
          — req
        </div>
      ) : (
        <div className="tabular-nums text-slate-500">
          {humanizeBytes(totals.requested)} / {humanizeBytes(totals.allocatable)} req
        </div>
      )}
    </div>
  )
}

function extendedCell(totals: ResourceTotals | undefined, podsUnavailable: boolean) {
  if (!totals) return <span className="text-slate-400">—</span>
  return (
    <div className="space-y-0.5 text-xs tabular-nums text-slate-700">
      <div>
        {podsUnavailable ? (
          <span className="text-slate-400" title={REQUESTED_UNAVAILABLE_REASON}>
            —
          </span>
        ) : (
          totals.requested
        )}{" "}
        / {totals.allocatable}
      </div>
      <div className="text-slate-400">capacity {totals.capacity}</div>
    </div>
  )
}

function compareRows(a: NodeRow, b: NodeRow, sort: SortState): number {
  const direction = sort.direction === "asc" ? 1 : -1
  switch (sort.column) {
    case "name":
      return a.name.localeCompare(b.name) * direction
    case "status":
      return statusLabel(a).localeCompare(statusLabel(b)) * direction
    case "roles":
      return (a.roles[0] ?? "").localeCompare(b.roles[0] ?? "") * direction
    case "cpu":
      return (requestedPct(a.standard.cpu) - requestedPct(b.standard.cpu)) * direction
    case "memory":
      return (requestedPct(a.standard.memory) - requestedPct(b.standard.memory)) * direction
    case "age": {
      const ta = a.creationTimestamp ? new Date(a.creationTimestamp).getTime() : 0
      const tb = b.creationTimestamp ? new Date(b.creationTimestamp).getTime() : 0
      // Older nodes have smaller timestamps; sorting asc by timestamp shows
      // oldest first, which matches the typical operator instinct for "Age asc".
      return (ta - tb) * direction
    }
    default: {
      // Dynamic extended-resource column: sort by requested %.
      const va = requestedPct(a.extended[sort.column] ?? { capacity: 0, allocatable: 0, requested: 0 })
      const vb = requestedPct(b.extended[sort.column] ?? { capacity: 0, allocatable: 0, requested: 0 })
      return (va - vb) * direction
    }
  }
}

function matchesFilter(row: NodeRow, q: string): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  if (row.name.toLowerCase().includes(needle)) return true
  if (row.roles.some((r) => r.toLowerCase().includes(needle))) return true
  return false
}

interface SortableHeaderProps {
  column: SortColumn
  label: string
  sort: SortState
  onSort: (column: SortColumn) => void
  className?: string
}

function SortableHeader({
  column,
  label,
  sort,
  onSort,
  className,
}: SortableHeaderProps) {
  const active = sort.column === column
  const Icon = active ? (sort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={`px-4 py-3 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 hover:text-slate-700"
      >
        {label}
        <Icon className="size-3" />
      </button>
    </th>
  )
}

/**
 * Per-node table rendered below the aggregate panel. Fixed columns
 * (Name, Status, Roles, CPU, Memory) plus one column per full
 * extended-resource key found in the cluster, then Age. Headers click
 * to sort; default sort is Name ascending. A filter input above the
 * table filters by name and roles substring.
 *
 * NotReady nodes show em dashes for CPU / Memory because status.capacity
 * stops being authoritative; the rest of the row remains visible so the
 * row remains a useful pointer for the operator. When pods-list failed
 * cluster-wide, Requested values in every cell are replaced by an em
 * dash with a tooltip explaining the missing permission.
 */
export function ClusterUsageTable({
  rows,
  extendedKeys,
  podsUnavailable = false,
}: ClusterUsageTableProps) {
  const [sort, setSort] = useState<SortState>({ column: "name", direction: "asc" })
  const [filter, setFilter] = useState("")

  const onSort = (column: SortColumn) => {
    setSort((s) =>
      s.column === column
        ? { column, direction: s.direction === "asc" ? "desc" : "asc" }
        : { column, direction: "asc" },
    )
  }

  const visibleRows = useMemo(
    () =>
      rows
        .filter((r) => matchesFilter(r, filter))
        .sort((a, b) => compareRows(a, b, sort)),
    [rows, sort, filter],
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input
          type="search"
          placeholder="Filter nodes by name or role…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter nodes"
          className="w-64 max-w-full rounded border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="text-xs text-slate-500">
          {visibleRows.length} of {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <SortableHeader column="name" label="Name" sort={sort} onSort={onSort} />
              <SortableHeader column="status" label="Status" sort={sort} onSort={onSort} />
              <SortableHeader column="roles" label="Roles" sort={sort} onSort={onSort} />
              <SortableHeader column="cpu" label="CPU" sort={sort} onSort={onSort} />
              <SortableHeader column="memory" label="Memory" sort={sort} onSort={onSort} />
              {extendedKeys.map((k) => (
                <th key={k} className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSort(k)}
                    className="flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-slate-700"
                  >
                    {k}
                    {sort.column === k ? (
                      sort.direction === "asc" ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3" />
                    )}
                  </button>
                </th>
              ))}
              <SortableHeader column="age" label="Age" sort={sort} onSort={onSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((r) => (
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
                <td className="px-4 py-3 align-top">
                  {cpuCell(r.standard.cpu, r.ready, podsUnavailable)}
                </td>
                <td className="px-4 py-3 align-top">
                  {memoryCell(r.standard.memory, r.ready, podsUnavailable)}
                </td>
                {extendedKeys.map((k) => (
                  <td key={k} className="px-4 py-3 align-top">
                    {extendedCell(r.extended[k], podsUnavailable)}
                  </td>
                ))}
                <td className="px-4 py-3 tabular-nums text-xs text-slate-500">{r.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
