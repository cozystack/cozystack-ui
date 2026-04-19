import { Check, X } from "lucide-react"
import { Section, Spinner, StatusBadge } from "@cozystack/ui"
import type { ApplicationDefinition } from "@cozystack/types"
import {
  iconDataUrl,
  isTenantModule,
  useApplicationDefinitions,
  useApplicationInstances,
} from "../lib/app-definitions.ts"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { humanizeKind } from "../lib/humanize.ts"
import { Link } from "react-router"

/**
 * One card per tenant module. Enabled-state is inferred from the actual
 * presence of an instance of that kind in the tenant namespace — that way
 * always-on modules like Info (no Tenant.spec flag) still light up, and
 * flag-driven ones (etcd/ingress/monitoring/seaweedfs) agree with what the
 * chart has actually rendered.
 *
 * TODO(bff): when the server grows a dedicated "tenant modules" endpoint it
 * should return the enabled/disabled state directly instead of us having to
 * fan out a list() per module.
 */
function ModuleCard({
  ad,
  namespace,
}: {
  ad: ApplicationDefinition
  namespace: string | null
}) {
  const { data, isLoading } = useApplicationInstances(ad, namespace ?? undefined)
  const instance = data?.items?.[0]
  const enabled = !!instance
  const kind = ad.spec?.application.kind ?? ad.metadata.name
  const plural = ad.spec?.application.plural ?? ad.metadata.name
  const target = enabled && instance
    ? `/console/${plural}/${instance.metadata.name}`
    : `/marketplace/${ad.metadata.name}`
  const icon = iconDataUrl(ad)

  return (
    <Link
      to={target}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {icon ? <img src={icon} alt="" className="h-full w-full" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">
          {humanizeKind(kind)}
        </p>
        <p className="truncate text-xs text-slate-500">
          {ad.spec?.dashboard?.description ?? kind}
        </p>
      </div>
      {isLoading ? (
        <Spinner />
      ) : (
        <StatusBadge tone={enabled ? "ok" : "muted"}>
          {enabled ? <Check className="size-3" /> : <X className="size-3" />}
          {enabled ? "Enabled" : "Disabled"}
        </StatusBadge>
      )}
    </Link>
  )
}

export function ModulesPage() {
  const { data, isLoading } = useApplicationDefinitions()
  const { tenantNamespace } = useTenantContext()

  const modules = (data?.items ?? [])
    .filter(isTenantModule)
    .sort((a, b) =>
      (a.spec?.application.kind ?? "").localeCompare(
        b.spec?.application.kind ?? "",
      ),
    )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Spinner /> Loading modules…
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-slate-900">Modules</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Tenant-scoped add-ons. A module is enabled as soon as the tenant
          chart has deployed its singleton into this tenant's namespace.
        </p>
      </div>

      {modules.length === 0 ? (
        <Section>
          <p className="py-6 text-center text-sm text-slate-500">No modules.</p>
        </Section>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((ad) => (
            <ModuleCard key={ad.metadata.name} ad={ad} namespace={tenantNamespace} />
          ))}
        </div>
      )}
    </div>
  )
}
