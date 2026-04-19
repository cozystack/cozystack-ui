import { useMemo } from "react"
import { Link } from "react-router"
import { Check, X } from "lucide-react"
import { Section, Spinner, StatusBadge, cn } from "@cozystack/ui"
import {
  iconDataUrl,
  isTenantModule,
  useApplicationDefinitions,
} from "../lib/app-definitions.ts"
import { useTenantContext } from "../lib/tenant-context.tsx"
import { humanizeKind } from "../lib/humanize.ts"

/**
 * Administration → Modules: every ApplicationDefinition marked as a tenant
 * module (`spec.dashboard.module: true`). Each row shows whether the module
 * is enabled for the currently selected tenant by reading the matching
 * boolean on `Tenant.spec` — the tenant Helm chart toggles singleton
 * installation based on those flags.
 *
 * TODO(bff): ideally the server would return the current enabled/disabled
 * state per module so we don't reverse-engineer it from `Tenant.spec`. Not
 * every module is controlled by a like-named flag (e.g. `harbor`), so the
 * current heuristic will mark those as unknown until the backend grows a
 * proper accessor.
 */
export function ModulesPage() {
  const { data, isLoading } = useApplicationDefinitions()
  const { tenants, selectedTenant } = useTenantContext()

  const modules = useMemo(
    () =>
      (data?.items ?? [])
        .filter(isTenantModule)
        .sort((a, b) =>
          (a.spec?.application.kind ?? "").localeCompare(
            b.spec?.application.kind ?? "",
          ),
        ),
    [data],
  )

  const currentTenant = tenants.find((t) => t.metadata.name === selectedTenant)

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
          Tenant-scoped add-ons. Enable or disable them by flipping the matching
          flag on the <code className="text-slate-700">Tenant</code> resource;
          configure them here once enabled.
        </p>
      </div>

      {modules.length === 0 ? (
        <Section>
          <p className="py-6 text-center text-sm text-slate-500">No modules.</p>
        </Section>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((ad) => {
            const kind = ad.spec?.application.kind ?? ad.metadata.name
            const plural = ad.spec?.application.plural ?? ad.metadata.name
            const singletonName = kind.toLowerCase()
            const specKey = ad.metadata.name
            const enabled =
              (currentTenant?.spec as Record<string, unknown> | undefined)?.[specKey] === true
            const icon = iconDataUrl(ad)
            return (
              <Link
                key={ad.metadata.name}
                to={`/console/${plural}/${singletonName}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-shadow hover:shadow-sm",
                  "border-slate-200",
                )}
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
                {currentTenant ? (
                  <StatusBadge tone={enabled ? "ok" : "muted"}>
                    {enabled ? <Check className="size-3" /> : <X className="size-3" />}
                    {enabled ? "Enabled" : "Disabled"}
                  </StatusBadge>
                ) : null}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
