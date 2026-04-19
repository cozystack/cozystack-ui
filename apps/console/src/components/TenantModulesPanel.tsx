import { Link } from "react-router"
import { Check, X, ExternalLink } from "lucide-react"
import { cn } from "@cozystack/ui"
import type { Tenant, ApplicationDefinition } from "@cozystack/types"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { iconDataUrl, appDisplayName } from "../lib/app-definitions.ts"

/**
 * The cozystack tenant chart treats a handful of sub-apps as "modules": they
 * have exactly one instance per tenant and are opt-in through booleans on the
 * Tenant spec. Enabling a module in the Tenant spec causes the chart to
 * create a singleton Monitoring/Ingress/Etcd/SeaweedFS instance in the tenant
 * namespace, which the user can further customise in the marketplace form.
 */
const TENANT_MODULES: { adName: string; specKey: string }[] = [
  { adName: "monitoring", specKey: "monitoring" },
  { adName: "ingress", specKey: "ingress" },
  { adName: "etcd", specKey: "etcd" },
  { adName: "seaweedfs", specKey: "seaweedfs" },
]

interface TenantModulesPanelProps {
  tenant: Tenant
}

function ModuleCard({
  ad,
  enabled,
  tenantName,
}: {
  ad: ApplicationDefinition
  enabled: boolean
  tenantName: string
}) {
  const icon = iconDataUrl(ad)
  const kind = ad.spec?.application.kind ?? ""
  const plural = ad.spec?.application.plural ?? ""
  // Singleton name convention: lower-cased kind (e.g. Monitoring → monitoring).
  const singletonName = kind.toLowerCase()
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        enabled
          ? "border-green-200 bg-green-50/40"
          : "border-slate-200 bg-white",
      )}
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {icon ? <img src={icon} alt="" className="h-full w-full" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{appDisplayName(ad)}</p>
        <p className="text-xs text-slate-500">
          {ad.spec?.dashboard?.description ?? kind}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {enabled ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <Check className="h-3.5 w-3.5" /> Enabled
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            <X className="h-3.5 w-3.5" /> Disabled
          </span>
        )}
        <Link
          to={
            enabled
              ? `/console/${plural}/${singletonName}`
              : `/marketplace/tenants?name=${tenantName}`
          }
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          {enabled ? "Configure" : "Enable"}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

export function TenantModulesPanel({ tenant }: TenantModulesPanelProps) {
  const { data: defs } = useApplicationDefinitions()
  if (!defs) return null

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Tenant modules
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Singletons that the tenant chart creates in this tenant's namespace.
        Toggle them by editing the <code>Tenant</code> resource.
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {TENANT_MODULES.map(({ adName, specKey }) => {
          const ad = defs.items.find((d) => d.metadata.name === adName)
          if (!ad) return null
          const enabled = Boolean(
            (tenant.spec as Record<string, unknown> | undefined)?.[specKey],
          )
          return (
            <ModuleCard
              key={adName}
              ad={ad}
              enabled={enabled}
              tenantName={tenant.metadata.name}
            />
          )
        })}
      </div>
    </section>
  )
}
