import { useMemo } from "react"
import { useSearchParams } from "react-router"
import { Spinner } from "@cozystack/ui"
import {
  useApplicationDefinitions,
  groupByCategory,
} from "../lib/app-definitions.ts"
import { AppCard } from "../components/AppCard.tsx"

export function MarketplaceList() {
  const { data, isLoading, error } = useApplicationDefinitions()
  const [params] = useSearchParams()
  const category = params.get("category")

  const categories = useMemo(() => groupByCategory(data), [data])
  const visible = useMemo(
    () => (category ? categories.filter((c) => c.category === category) : categories),
    [categories, category],
  )

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-slate-500">
        <Spinner /> Loading marketplace…
      </div>
    )
  }
  if (error) {
    return (
      <div className="p-8 text-red-600">
        Failed to load ApplicationDefinitions: {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Marketplace</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pick an application to deploy into the selected tenant.
        </p>
      </div>
      {visible.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center text-slate-500">
          No applications in this category.
        </div>
      )}
      <div className="space-y-8">
        {visible.map(({ category, items }) => (
          <section key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              {category}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {items.map((ad) => (
                <AppCard key={ad.metadata.name} ad={ad} to={`/marketplace/${ad.metadata.name}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
