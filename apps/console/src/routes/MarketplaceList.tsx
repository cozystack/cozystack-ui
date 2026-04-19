import { useMemo } from "react"
import { useParams } from "react-router"
import { Spinner } from "@cozystack/ui"
import {
  useApplicationDefinitions,
  groupByCategory,
} from "../lib/app-definitions.ts"
import { AppCard } from "../components/AppCard.tsx"

export function MarketplaceList() {
  const { data, isLoading, error } = useApplicationDefinitions()
  const { category: rawCategory } = useParams<{ category?: string }>()
  const category = rawCategory ? decodeURIComponent(rawCategory) : null

  // Modules are configured per-tenant under Administration → Modules, not
  // installed from the marketplace. Likewise Tenant itself lives in its own
  // Administration → Tenants page.
  const categories = useMemo(() => groupByCategory(data), [data])
  const visible = useMemo(
    () => (category ? categories.filter((c) => c.category === category) : categories),
    [categories, category],
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Spinner /> Loading marketplace…
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load ApplicationDefinitions: {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Marketplace</h1>
      <p className="mb-6 text-sm text-slate-500">Choose a product to deploy</p>

      {visible.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
          No applications in this category.
        </div>
      )}

      <div className="space-y-8">
        {visible.map(({ category, items }) => (
          <section key={category}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {category}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((ad) => (
                <AppCard
                  key={ad.metadata.name}
                  ad={ad}
                  to={`/marketplace/${ad.metadata.name}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
