import { Link } from "react-router"
import { StatusBadge, Spinner } from "@cozystack/ui"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { formatAge, readyCondition } from "../lib/status.ts"

export function TenantsPage() {
  const { tenants, isLoading } = useTenantContext()

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Tenants</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tenants are top-level owners of their own namespaces and applications.
          </p>
        </div>
        <Link
          to="/marketplace/tenant"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create tenant
        </Link>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Spinner /> Loading…
        </div>
      ) : tenants.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No tenants yet.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Host</th>
                <th className="px-4 py-2">Modules</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Age</th>
                <th className="px-4 py-2"></th>
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
                  <tr key={t.metadata.name}>
                    <td className="px-4 py-2 font-mono text-xs text-slate-800">
                      {t.metadata.name}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {t.spec?.host || "—"}
                    </td>
                    <td className="px-4 py-2">
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
                    <td className="px-4 py-2">
                      {ready ? (
                        <StatusBadge tone={ready.status === "True" ? "ok" : "warn"}>
                          {ready.status === "True" ? "Ready" : (ready.reason ?? "NotReady")}
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="muted">Unknown</StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {formatAge(t.metadata.creationTimestamp)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        to={`/console/tenants/${t.metadata.name}/edit`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
