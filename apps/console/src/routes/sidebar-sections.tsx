import { useMemo } from "react"
import { Store, LayoutGrid, Boxes, Users } from "lucide-react"
import type { SidebarSection } from "@cozystack/ui"
import { useApplicationDefinitions, groupByCategory } from "../lib/app-definitions.ts"

/**
 * Sidebar is driven entirely by ApplicationDefinitions in the cluster.
 * Marketplace shows categories; Console shows the categories of apps the
 * current tenant can manage.
 */
export function useSidebarSections(): SidebarSection[] {
  const { data } = useApplicationDefinitions()
  const categories = useMemo(() => groupByCategory(data), [data])

  return useMemo<SidebarSection[]>(() => {
    const marketplaceItems = [
      { label: "All applications", to: "/marketplace", end: true, icon: LayoutGrid },
      ...categories.map(({ category }) => ({
        label: category,
        to: `/marketplace?category=${encodeURIComponent(category)}`,
        icon: Store,
      })),
    ]
    const consoleItems = [
      { label: "Deployed applications", to: "/console", end: true, icon: Boxes },
      { label: "Tenants", to: "/console/tenants", icon: Users },
    ]
    return [
      { title: "Marketplace", items: marketplaceItems },
      { title: "Console", items: consoleItems },
    ]
  }, [categories])
}
