import { Link, useParams } from "react-router"
import { Section, Spinner } from "@cozystack/ui"
import { ChevronLeft } from "lucide-react"
import { humanizeBytes, humanizeCpu } from "../lib/k8s-quantity.ts"
import { useClusterUsageData } from "../hooks/useClusterUsageData.tsx"
import {
  STANDARD_RESOURCE_KEY_SET,
  type ResourceTotals,
  type StandardResourceKey,
} from "../lib/cluster-usage/types.ts"

/**
 * Admin → Resources → per-resource usage. Reached by clicking a resource on
 * the Resources page (/admin/resources-usage/r/<key>). Shows the same usage
 * view as the Resources table, pivoted to nodes: one row per node with the
 * selected resource's Capacity / Allocatable / Requested / Used.
 *
 * The resource key arrives via a splat param so keys containing slashes
 * (every vendor.com/model GPU name) survive routing without encoding.
 */

type ResourceFormat = "cpu" | "bytes" | "count"

function formatFor(resource: string): ResourceFormat {
  if (resource === "cpu") return "cpu"
  if (resource === "memory" || resource === "ephemeral-storage") return "bytes"
  return "count"
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

export function ClusterUsageResourcePage() {
  const params = useParams()
  const resource = params["*"] ?? ""
  const isStandard = STANDARD_RESOURCE_KEY_SET.has(resource)
  const format = formatFor(resource)

  const { perNode, nodes, isLoading, error, errorStatus, podsUnavailable } =
    useClusterUsageData()

  const rows = [...perNode]
    .map((n) => ({
      name: n.name,
      ready: n.ready,
      totals: (isStandard
        ? n.standard[resource as StandardResourceKey]
        : n.extended[resource]) as ResourceTotals | undefined,
    }))
    .filter((r) => r.totals && r.totals.allocatable > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const totalsSum = rows.reduce(
    (acc, r) => {
      acc.capacity += r.totals?.capacity ?? 0
      acc.allocatable += r.totals?.allocatable ?? 0
      acc.requested += r.totals?.requested ?? 0
      acc.usedDefined = acc.usedDefined || r.totals?.used !== undefined
      acc.used += r.totals?.used ?? 0
      return acc
    },
    { capacity: 0, allocatable: 0, requested: 0, used: 0, usedDefined: false },
  )

  const cell = (value: number | undefined) =>
    value === undefined ? "—" : formatValue(value, format)

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          to="/admin/resources-usage"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="size-3.5" /> Resources
        </Link>
        <h1 className="font-mono text-xl font-semibold break-all text-slate-900">
          {resource}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Per-node capacity, allocation and usage of this resource across the
          cluster.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading…
        </div>
      ) : error ? (
        <Section>
          {errorStatus === 403 ? (
            <div className="px-2 py-4 text-sm text-slate-700">
              You do not have permission to view cluster nodes.{" "}
              <Link to="/console" className="text-blue-700 underline hover:text-blue-800">
                Back to console
              </Link>
              .
            </div>
          ) : (
            <div className="px-2 py-4 text-sm text-red-700">
              Failed to load cluster nodes: {error.message}
            </div>
          )}
        </Section>
      ) : nodes.length === 0 ? (
        <Section>
          <p className="py-6 text-center text-sm text-slate-500">No nodes found.</p>
        </Section>
      ) : rows.length === 0 ? (
        <Section>
          <p className="py-6 text-center text-sm text-slate-500">
            No node exposes <span className="font-mono">{resource}</span>.
          </p>
        </Section>
      ) : (
        <Section>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-3 py-2 font-medium text-slate-600">Node</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Capacity</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Allocatable</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Requested</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.name} data-node-row={r.name} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-900">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {cell(r.totals?.capacity)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {cell(r.totals?.allocatable)}
                  </td>
                  <td
                    className="px-3 py-2 text-right tabular-nums text-slate-700"
                    title={podsUnavailable ? "Requires cluster-wide pod read access" : undefined}
                  >
                    {podsUnavailable ? "—" : cell(r.totals?.requested)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                    {r.totals?.used !== undefined ? cell(r.totals.used) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                <td className="px-3 py-2 text-slate-700">
                  Total · {rows.length} node{rows.length === 1 ? "" : "s"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatValue(totalsSum.capacity, format)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatValue(totalsSum.allocatable, format)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {podsUnavailable ? "—" : formatValue(totalsSum.requested, format)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {totalsSum.usedDefined ? formatValue(totalsSum.used, format) : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </Section>
      )}
    </div>
  )
}
