import { Link } from "react-router"
import { Plus, Edit } from "lucide-react"
import { Spinner, Section, Button, StatusBadge } from "@cozystack/ui"
import { useK8sList } from "@cozystack/k8s-client"
import { APPS_GROUP, APPS_VERSION, type ApplicationInstance } from "@cozystack/types"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { formatAge, readyCondition } from "../lib/status.ts"

export function TenantsPage() {
  const { tenantNamespace } = useTenantContext()

  const { data, isLoading } = useK8sList<ApplicationInstance>(
    {
      apiGroup: APPS_GROUP,
      apiVersion: APPS_VERSION,
      plural: "tenants",
      namespace: tenantNamespace ?? "",
    },
    { enabled: !!tenantNamespace }
  )

  const tenants = data?.items ?? []

  return (
    <div className="p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tenants</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Top-level owners of their own namespaces and applications.
          </p>
        </div>
        <Link to="/marketplace/tenant">
          <Button variant="primary" size="sm">
            <Plus className="size-3.5" /> Create tenant
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading…
        </div>
      ) : tenants.length === 0 ? (
        <Section>
          <p className="py-6 text-center text-sm text-slate-500">No tenants in this namespace yet.</p>
        </Section>
      ) : (
        <Section bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => {
                const ready = readyCondition(t)
                return (
                  <tr key={t.metadata.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {t.metadata.name}
                    </td>
                    <td className="px-4 py-3">
                      {ready ? (
                        <StatusBadge tone={ready.status === "True" ? "ok" : "warn"}>
                          {ready.status === "True" ? "Ready" : (ready.reason ?? "NotReady")}
                        </StatusBadge>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-slate-500">
                      {formatAge(t.metadata.creationTimestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/console/tenants/${t.metadata.name}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="size-3.5" /> Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}
