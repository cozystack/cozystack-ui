import { Link } from "react-router"
import { Archive, Plus } from "lucide-react"
import { Button, Section, Spinner } from "@cozystack/ui"
import { useK8sList } from "@cozystack/k8s-client"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { formatAge } from "../lib/status.ts"

interface BackupResource {
  metadata: {
    name: string
    namespace?: string
    creationTimestamp?: string
  }
  status?: {
    phase?: string
    conditions?: Array<{
      type: string
      status: string
      reason?: string
      message?: string
    }>
  }
}

interface BackupResourceListPageProps {
  resourceType: "plans" | "backupjobs" | "backups" | "restorejobs"
  title: string
}

export function BackupResourceListPage({ resourceType, title }: BackupResourceListPageProps) {
  const { tenantNamespace } = useTenantContext()

  const { data, isLoading, error } = useK8sList<BackupResource>({
    apiGroup: "backups.cozystack.io",
    apiVersion: "v1alpha1",
    plural: resourceType,
    namespace: tenantNamespace ?? "",
  }, { enabled: !!tenantNamespace })

  const items = data?.items ?? []

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Spinner /> Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load {title}: {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-slate-100">
            <Archive className="size-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>
        <Link to={`/console/backups/${resourceType}/create`}>
          <Button variant="primary" size="sm">
            <Plus className="size-3.5" /> Create {title.slice(0, -1)}
          </Button>
        </Link>
      </div>

      <Section>
        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No {title.toLowerCase()} found in this namespace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Namespace</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Age</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const phase = item.status?.phase
                  const ready = item.status?.conditions?.find((c) => c.type === "Ready")
                  const statusText = phase || ready?.status || "Unknown"
                  const statusTone =
                    statusText === "Completed" || statusText === "True" ? "ok" :
                    statusText === "Failed" || statusText === "False" ? "error" :
                    "warn"

                  return (
                    <tr
                      key={item.metadata.name}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">
                        {item.metadata.name}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {item.metadata.namespace}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusTone === "ok"
                              ? "bg-green-100 text-green-800"
                              : statusTone === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {statusText}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">
                        {item.metadata.creationTimestamp
                          ? formatAge(item.metadata.creationTimestamp)
                          : "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}
