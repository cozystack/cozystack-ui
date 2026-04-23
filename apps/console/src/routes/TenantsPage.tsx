import { Link } from "react-router"
import { Plus, Edit } from "lucide-react"
import { Spinner, Section, Button } from "@cozystack/ui"
import { useK8sList } from "@cozystack/k8s-client"
import type { TenantNamespace } from "@cozystack/types"
import { tenantDisplayName, useTenantContext } from "../lib/tenant-context.tsx"
import { formatAge } from "../lib/status.ts"

interface TenantModule {
  metadata: {
    name: string
    namespace: string
  }
}

const MODULE_NAMES = ["etcd", "ingress", "monitoring", "seaweedfs"]

function tenantHost(ns: TenantNamespace): string | undefined {
  return ns.metadata.labels?.["namespace.cozystack.io/host"]
}

export function TenantsPage() {
  const { tenants, isLoading } = useTenantContext()

  // Load all TenantModules to determine which modules are enabled per tenant
  const { data: modulesData } = useK8sList<TenantModule>({
    apiGroup: "core.cozystack.io",
    apiVersion: "v1alpha1",
    plural: "tenantmodules",
  })

  // Group modules by namespace
  const modulesByNamespace = (modulesData?.items ?? []).reduce(
    (acc, mod) => {
      const ns = mod.metadata.namespace
      if (!acc[ns]) acc[ns] = []
      acc[ns].push(mod.metadata.name)
      return acc
    },
    {} as Record<string, string[]>,
  )

  // Get enabled modules for a tenant namespace
  const getEnabledModules = (ns: TenantNamespace): string[] => {
    const nsModules = modulesByNamespace[ns.metadata.name] ?? []
    return MODULE_NAMES.filter((m) => nsModules.includes(m))
  }

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
          <p className="py-6 text-center text-sm text-slate-500">No tenants yet.</p>
        </Section>
      ) : (
        <Section bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Namespace</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Modules</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => {
                const name = tenantDisplayName(t)
                const modules = getEnabledModules(t)
                const host = tenantHost(t)
                return (
                  <tr key={t.metadata.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {t.metadata.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{host ?? "—"}</td>
                    <td className="px-4 py-3">
                      {modules.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {modules.map((m) => (
                            <span
                              key={m}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-slate-500">
                      {formatAge(t.metadata.creationTimestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/console/tenants/${name}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="size-3" /> Edit
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
