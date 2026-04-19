import { Link } from "react-router"
import { Check, X } from "lucide-react"
import { cn } from "@cozystack/ui"
import type { Tenant, ApplicationDefinition } from "@cozystack/types"
import { useApplicationDefinitions } from "../lib/app-definitions.ts"
import { iconDataUrl, appDisplayName } from "../lib/app-definitions.ts"

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
}: {
  ad: ApplicationDefinition
  enabled: boolean
}) {
  const icon = iconDataUrl(ad)
  const kind = ad.spec?.application.kind ?? ""
  const plural = ad.spec?.application.plural ?? ""
  const singletonName = kind.toLowerCase()
  return (
    <Link
      to={enabled ? `/console/${plural}/${singletonName}` : `/marketplace/${ad.metadata.name}?name=${singletonName}`}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-shadow hover:shadow-sm",
        enabled ? "border-slate-200" : "border-slate-200",
      )}
    >
      <div className="size-9 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {icon ? <img src={icon} alt="" className="h-full w-full" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{appDisplayName(ad)}</p>
        <p className="truncate text-xs text-slate-500">
          {ad.spec?.dashboard?.description ?? kind}
        </p>
      </div>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
        )}
      >
        {enabled ? <Check className="size-3" /> : <X className="size-3" />}
        {enabled ? "Enabled" : "Disabled"}
      </span>
    </Link>
  )
}

export function TenantModulesPanel({ tenant }: TenantModulesPanelProps) {
  const { data: defs } = useApplicationDefinitions()
  if (!defs) return null

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Tenant modules
      </h2>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        {TENANT_MODULES.map(({ adName, specKey }) => {
          const ad = defs.items.find((d) => d.metadata.name === adName)
          if (!ad) return null
          const enabled = Boolean(
            (tenant.spec as Record<string, unknown> | undefined)?.[specKey],
          )
          return <ModuleCard key={adName} ad={ad} enabled={enabled} />
        })}
      </div>
    </section>
  )
}
