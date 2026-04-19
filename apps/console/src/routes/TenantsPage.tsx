import { Link } from "react-router"
import { Plus } from "lucide-react"
import { StatusBadge, Spinner, Section, Button } from "@cozystack/ui"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { formatAge, readyCondition } from "../lib/status.ts"

export function TenantsPage() {
  const { tenants, isLoading } = useTenantContext()

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
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">Modules</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenants.map((t) => {
                const ready = readyCondition(t)
                const modules = [
                  t.spec?.etcd ? "etcd" : null,
                  t.spec?.ingress ? "ingress" : null,
                  t.spec?.monitoring ? "monitoring" : null,
                  t.spec?.seaweedfs ? "seaweedfs" : null,
                ].filter(Boolean) as string[]
                return (
                  <tr key={t.metadata.name} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">
                      {t.metadata.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {t.spec?.host || "—"}
                    </td>
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
                    <td className="px-4 py-3">
                      {ready ? (
                        <StatusBadge tone={ready.status === "True" ? "ok" : "warn"}>
                          {ready.status === "True" ? "Ready" : (ready.reason ?? "NotReady")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">Unknown</StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-xs text-slate-500">
                      {formatAge(t.metadata.creationTimestamp)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/console/tenants/${t.metadata.name}/edit`}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Edit
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
