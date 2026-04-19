import { useMemo } from "react"
import {
  Boxes,
  Cloud,
  Database,
  LayoutGrid,
  Network,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { SidebarSection } from "@cozystack/ui"
import { useApplicationDefinitions, groupByCategory } from "../lib/app-definitions.ts"

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Administration: Settings,
  IaaS: Cloud,
  PaaS: Database,
  NaaS: Network,
}

/**
 * Sidebar is driven entirely by ApplicationDefinitions in the cluster.
 * Marketplace shows categories; Console shows static sub-sections.
 *
 * Categories are kept in the path (`/marketplace/c/<category>`) rather than
 * in a query string so that `NavLink`'s pathname-based active detection works
 * without custom logic.
 */
export function useSidebarSections(): SidebarSection[] {
  const { data } = useApplicationDefinitions()
  const categories = useMemo(() => groupByCategory(data), [data])

  return useMemo<SidebarSection[]>(() => {
    const marketplaceItems = [
      { label: "All applications", to: "/marketplace", end: true, icon: LayoutGrid },
      ...categories.map(({ category }) => ({
        label: category,
        to: `/marketplace/c/${encodeURIComponent(category)}`,
        icon: CATEGORY_ICONS[category] ?? LayoutGrid,
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
