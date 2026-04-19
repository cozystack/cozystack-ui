import { useMemo } from "react"
import {
  Globe,
  Info,
  Layers,
  ToyBrick,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { SidebarSection } from "@cozystack/ui"
import { useApplicationDefinitions, groupByCategory } from "../lib/app-definitions.ts"
import { humanizeKind } from "../lib/humanize.ts"
import {
  lucideIcon,
  simpleIconComponent,
  simpleIconSlug,
} from "../lib/sidebar-icons.tsx"
import type { ComponentType } from "react"

const CATEGORY_ORDER = ["IaaS", "PaaS", "NaaS"]

/**
 * Sidebar lists every non-module, non-Tenant ApplicationDefinition in the
 * cluster as a separate entry, grouped by IaaS / PaaS / NaaS. Tenant
 * modules are surfaced under Administration → Modules; Tenant itself is
 * under Administration → Tenants.
 */
export function useSidebarSections(): SidebarSection[] {
  const { data } = useApplicationDefinitions()
  const grouped = useMemo(() => groupByCategory(data), [data])

  return useMemo<SidebarSection[]>(() => {
    const sorted = [...grouped]
      .filter(({ category }) => CATEGORY_ORDER.includes(category))
      .sort(
        (a, b) =>
          CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
      )

    const categorySections: SidebarSection[] = sorted.map(({ category, items }) => ({
      title: category,
      items: items.map((ad) => {
        const kind = ad.spec?.application.kind ?? ad.metadata.name
        const plural = ad.spec?.application.plural ?? ad.metadata.name
        const slug = simpleIconSlug(kind)
        const lucide = lucideIcon(kind)
        const icon: ComponentType<{ className?: string }> | LucideIcon =
          slug ? simpleIconComponent(slug) : (lucide ?? Layers)
        return {
          label: humanizeKind(kind),
          to: `/console/${plural}`,
          icon,
        }
      }),
    }))

    const administrationSection: SidebarSection = {
      title: "Administration",
      items: [
        { label: "Info", to: "/console/info", icon: Info },
        { label: "Modules", to: "/console/modules", icon: ToyBrick },
        { label: "External IPs", to: "/console/external-ips", icon: Globe },
        { label: "Tenants", to: "/console/tenants", icon: Users },
      ],
    }

    return [...categorySections, administrationSection]
  }, [grouped])
}
