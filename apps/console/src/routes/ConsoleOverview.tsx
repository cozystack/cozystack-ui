import { useMemo } from "react"
import { Link } from "react-router"
import { Spinner } from "@cozystack/ui"
import type { ApplicationDefinition, ApplicationInstance } from "@cozystack/types"
import {
  useApplicationDefinitions,
  useApplicationInstances,
} from "../lib/app-definitions.ts"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { InstanceCard } from "../components/InstanceCard.tsx"
import { TenantModulesPanel } from "../components/TenantModulesPanel.tsx"

function TenantApps({ ad, namespace }: { ad: ApplicationDefinition; namespace: string }) {
  const { data } = useApplicationInstances(ad, namespace)
  const items = data?.items ?? []
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        {ad.spec?.application.kind}{" "}
        <span className="text-slate-400">({items.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {items.map((inst: ApplicationInstance) => (
          <InstanceCard
            key={inst.metadata.name}
            ad={ad}
            instance={inst}
          />
        ))}
      </div>
    </section>
  )
}

export function ConsoleOverview() {
  const { data, isLoading } = useApplicationDefinitions()
  const { tenantNamespace, selectedTenant, tenants } = useTenantContext()
  const currentTenant = tenants.find((t) => t.metadata.name === selectedTenant)

  const ads = useMemo(
    () =>
      (data?.items ?? []).slice().sort((a, b) =>
        (a.spec?.application.kind ?? "").localeCompare(
          b.spec?.application.kind ?? "",
        ),
      ),
    [data],
  )

  if (!tenantNamespace) {
    return (
      <div className="p-8 text-slate-600">
        Select a tenant to view its deployed applications.
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Deployed applications</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tenant <code>{selectedTenant}</code> ·{" "}
            <code className="text-slate-400">{tenantNamespace}</code>
          </p>
        </div>
        <Link
          to="/marketplace"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Deploy application
        </Link>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Spinner /> Loading…
        </div>
      ) : (
        <div className="space-y-8">
          {currentTenant && <TenantModulesPanel tenant={currentTenant} />}
          <div className="space-y-6">
            {ads
              .filter(
                (ad) =>
                  !["monitoring", "ingress", "etcd", "seaweedfs"].includes(
                    ad.metadata.name,
                  ),
              )
              .map((ad) => (
                <TenantApps key={ad.metadata.name} ad={ad} namespace={tenantNamespace} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
