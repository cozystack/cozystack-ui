import { useMemo } from "react"
import { Link, useParams } from "react-router"
import { Section, Spinner } from "@cozystack/ui"
import { useK8sList } from "@cozystack/k8s-client"
import { APPS_GROUP } from "@cozystack/types"
import { ChevronLeft } from "lucide-react"
import { parseQuantity, humanizeBytes, humanizeCpu } from "../lib/k8s-quantity.ts"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { TENANT_NAMESPACE_PREFIX } from "../lib/constants.ts"
import type { Pod } from "../lib/cluster-usage/types.ts"

/**
 * Admin → Resources → per-resource drill-down. Given a resource key
 * (e.g. `cpu`, `memory`, or an extended resource like
 * `nvidia.com/GH100_H200_SXM_141GB`) this lists who consumes it across the
 * whole cluster, grouped by tenant namespace and the owning application.
 *
 * Ownership is read from pod labels — Cozystack stamps
 * `apps.cozystack.io/application.{kind,name}` on every workload pod; we
 * fall back to the Helm `app.kubernetes.io/instance` label and finally to
 * the bare pod name so nothing is silently dropped.
 *
 * The resource key arrives via a splat param (`cluster-usage/r/*`) so keys
 * containing slashes (every `vendor.com/model` GPU name) survive routing
 * without encoding.
 */

interface UsageRow {
  namespace: string
  kind: string
  name: string
  pods: number
  requested: number
}

function formatResource(resource: string, value: number): string {
  if (resource === "cpu") return humanizeCpu(value)
  if (resource === "memory" || resource === "ephemeral-storage") {
    return humanizeBytes(value)
  }
  return value % 1 === 0 ? `${value}` : value.toFixed(2)
}

/** Sum a single resource across all of a pod's containers (requests, then limits). */
function podResourceRequest(pod: Pod, resource: string): number {
  let total = 0
  for (const container of pod.spec?.containers ?? []) {
    const req = container.resources?.requests?.[resource]
    const lim = container.resources?.limits?.[resource]
    const value = req ?? lim
    if (value !== undefined) total += parseQuantity(value)
  }
  return total
}

/** Derive the owning application (kind + name) of a pod from its labels. */
function podOwner(pod: Pod): { kind: string; name: string } {
  const labels = pod.metadata.labels ?? {}
  const kind = labels[`${APPS_GROUP}/application.kind`]
  const name =
    labels[`${APPS_GROUP}/application.name`] ??
    labels["app.kubernetes.io/instance"] ??
    labels["app.kubernetes.io/name"]
  if (kind && name) return { kind, name }
  if (name) return { kind: kind ?? "—", name }
  return { kind: kind ?? "—", name: pod.metadata.name }
}

export function ClusterUsageResourcePage() {
  const params = useParams()
  const resource = params["*"] ?? ""

  const {
    data: podsList,
    isLoading,
    error,
  } = useK8sList<Pod>({ apiGroup: "", apiVersion: "v1", plural: "pods" })

  // Map application kind → plural so a consumer row can deep-link to the
  // deployed application's Console page (/console/<plural>/<name>).
  const { data: appDefs } = useApplicationDefinitions()
  const { selectTenant } = useTenantContext()
  const kindToPlural = useMemo(() => {
    const map = new Map<string, string>()
    for (const ad of appDefs?.items ?? []) {
      const kind = ad.spec?.application.kind
      const plural = ad.spec?.application.plural
      if (kind && plural) map.set(kind, plural)
    }
    return map
  }, [appDefs])

  const { rows, totalRequested, totalPods } = useMemo(() => {
    const byKey = new Map<string, UsageRow>()
    let totalRequested = 0
    let totalPods = 0
    for (const pod of podsList?.items ?? []) {
      const requested = podResourceRequest(pod, resource)
      if (requested <= 0) continue
      const namespace = pod.metadata.namespace ?? "—"
      // Only tenant namespaces are relevant here — skip system/control-plane
      // namespaces (cozy-*, kube-system, …) that also consume the resource.
      if (!namespace.startsWith(TENANT_NAMESPACE_PREFIX)) continue
      const { kind, name } = podOwner(pod)
      const key = `${namespace}/${kind}/${name}`
      const existing = byKey.get(key)
      if (existing) {
        existing.pods += 1
        existing.requested += requested
      } else {
        byKey.set(key, { namespace, kind, name, pods: 1, requested })
      }
      totalRequested += requested
      totalPods += 1
    }
    const rows = [...byKey.values()].sort((a, b) => b.requested - a.requested)
    return { rows, totalRequested, totalPods }
  }, [podsList, resource])

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          to="/admin/capacity/cluster"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ChevronLeft className="size-3.5" /> Cluster
        </Link>
        <h1 className="font-mono text-xl font-semibold break-all text-slate-900">
          {resource}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Consumers of this resource across all tenants, grouped by namespace
          and owning application (derived from pod labels).
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading…
        </div>
      ) : error ? (
        <Section>
          <div className="px-2 py-4 text-sm text-red-700">
            Failed to load pods: {error.message}
          </div>
        </Section>
      ) : rows.length === 0 ? (
        <Section>
          <p className="py-6 text-center text-sm text-slate-500">
            No workloads are requesting{" "}
            <span className="font-mono">{resource}</span>.
          </p>
        </Section>
      ) : (
        <Section>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-3 py-2 font-medium text-slate-600">Tenant (namespace)</th>
                <th className="px-3 py-2 font-medium text-slate-600">Kind</th>
                <th className="px-3 py-2 font-medium text-slate-600">Name</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Pods</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                // Deep-link the consumer to its deployed application in the
                // Console, but only when it is a real app instance: the kind
                // must resolve to a plural and it must live in a tenant
                // namespace (so we can switch the Console's tenant context).
                const plural = kindToPlural.get(r.kind)
                const tenant = r.namespace.startsWith(TENANT_NAMESPACE_PREFIX)
                  ? r.namespace.slice(TENANT_NAMESPACE_PREFIX.length)
                  : null
                const appHref = plural && tenant ? `/console/${plural}/${r.name}` : null
                return (
                  <tr key={`${r.namespace}/${r.kind}/${r.name}`} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{r.namespace}</td>
                    <td className="px-3 py-2 text-slate-600">{r.kind}</td>
                    <td className="px-3 py-2">
                      {appHref ? (
                        <Link
                          to={appHref}
                          onClick={() => tenant && selectTenant(tenant)}
                          className="text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        <span className="text-slate-700">{r.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">{r.pods}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {formatResource(resource, r.requested)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-medium">
                <td className="px-3 py-2 text-slate-700" colSpan={3}>
                  Total · {rows.length} consumer{rows.length === 1 ? "" : "s"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{totalPods}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                  {formatResource(resource, totalRequested)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Section>
      )}
    </div>
  )
}
