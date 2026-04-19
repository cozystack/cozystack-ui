import { useMemo } from "react"
import { Layers, Users, type LucideIcon } from "lucide-react"
import type { SidebarSection } from "@cozystack/ui"
import { useApplicationDefinitions, groupByCategory } from "../lib/app-definitions.ts"
import { humanizeKind } from "../lib/humanize.ts"

const CATEGORY_ORDER = ["IaaS", "PaaS", "NaaS", "Administration"]

/**
 * Sidebar lists every ApplicationDefinition in the cluster as a separate
 * entry, grouped by category. Clicking an entry goes to that kind's
 * instances list (`/console/<plural>`).
 */
export function useSidebarSections(): SidebarSection[] {
  const { data } = useApplicationDefinitions()
  const grouped = useMemo(() => groupByCategory(data), [data])

  return useMemo<SidebarSection[]>(() => {
    const sorted = [...grouped].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category)
      const bi = CATEGORY_ORDER.indexOf(b.category)
      return (
        (ai === -1 ? CATEGORY_ORDER.length : ai) -
        (bi === -1 ? CATEGORY_ORDER.length : bi)
      )
    })

    const sections: SidebarSection[] = sorted.map(({ category, items }) => ({
      title: category,
      items: items.map((ad) => {
        const kind = ad.spec?.application.kind ?? ad.metadata.name
        const plural = ad.spec?.application.plural ?? ad.metadata.name
        const icon: LucideIcon = Layers
        return {
          label: humanizeKind(kind),
          to: `/console/${plural}`,
          icon,
        }
      }),
    }))

    // Make sure Tenants appears as a top-level entry under Administration.
    const adminIdx = sections.findIndex((s) => s.title === "Administration")
    if (adminIdx >= 0) {
      if (!sections[adminIdx].items.some((i) => i.to === "/console/tenants")) {
        sections[adminIdx].items.push({
          label: "Tenants",
          to: "/console/tenants",
          icon: Users,
        })
      }
    } else {
      sections.push({
        title: "Administration",
        items: [{ label: "Tenants", to: "/console/tenants", icon: Users }],
      })
    }

    return sections
  }, [grouped])
}
