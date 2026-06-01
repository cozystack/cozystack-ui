import { useMemo } from "react"
import {
  Archive,
  Cloud,
  Database,
  Gauge,
  Globe,
  Info,
  LayoutGrid,
  Layers,
  Network,
  ToyBrick,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { SidebarSection } from "@cozystack/ui"
import { useSelfSubjectAccessReview } from "@cozystack/k8s-client"
import { useBackupClassAdminAccess } from "../hooks/useBackupClassAdminAccess.ts"
import { useApplicationDefinitions, groupByCategory } from "../lib/app-definitions.ts"
import { humanizeKind } from "../lib/humanize.ts"
import {
  lucideIcon,
  simpleIconComponent,
  simpleIconSlug,
} from "../lib/sidebar-icons.tsx"
import type { ComponentType } from "react"

const MARKETPLACE_CATEGORIES = ["IaaS", "PaaS", "NaaS"]
const CATEGORY_ICON: Record<string, LucideIcon> = {
  IaaS: Cloud,
  PaaS: Database,
  NaaS: Network,
}

/**
 * Marketplace sidebar: a flat list of filters — "All applications" followed
 * by the three categories. Category links rely on pathname-based matching
 * (`/marketplace/c/<category>`) so NavLink correctly highlights the active
 * entry; see MarketplaceList for the counterpart.
 */
export function useMarketplaceSidebarSections(): SidebarSection[] {
  const { data } = useApplicationDefinitions()
  const grouped = useMemo(() => groupByCategory(data), [data])

  return useMemo<SidebarSection[]>(() => {
    const available = grouped
      .map((g) => g.category)
      .filter((c) => MARKETPLACE_CATEGORIES.includes(c))
    const ordered = MARKETPLACE_CATEGORIES.filter((c) => available.includes(c))

    return [
      {
        title: "Marketplace",
        items: [
          { label: "Marketplace", to: "/marketplace", end: true, icon: LayoutGrid },
          ...ordered.map((category) => ({
            label: category,
            to: `/marketplace/c/${encodeURIComponent(category)}`,
            icon: CATEGORY_ICON[category] ?? LayoutGrid,
          })),
        ],
      },
    ]
  }, [grouped])
}

/**
 * Console sidebar: every non-module, non-Tenant ApplicationDefinition in the
 * cluster as a separate entry grouped by IaaS / PaaS / NaaS, plus a fixed
 * Administration section (Info, Modules, External IPs, Tenants).
 */
export function useConsoleSidebarSections(): SidebarSection[] {
  const { data } = useApplicationDefinitions()
  const grouped = useMemo(() => groupByCategory(data), [data])
  // Permission gate for the Cluster Usage entry: only operators with
  // cluster-wide nodes/list see the menu item. Loading and error states
  // resolve as "not allowed" so the entry never flickers in then out
  // for users who can't see it.
  const clusterUsageReview = useSelfSubjectAccessReview({
    resourceAttributes: { resource: "nodes", verb: "list" },
  })
  const canSeeClusterUsage =
    !clusterUsageReview.isLoading &&
    !clusterUsageReview.error &&
    clusterUsageReview.allowed
  // Backup Classes is admin-only: tenants have cluster-wide read on
  // backupclasses, so the entry is gated on write (update), not list.
  const { allowed: canManageBackupClasses } = useBackupClassAdminAccess()

  return useMemo<SidebarSection[]>(() => {
    const sorted = [...grouped]
      .filter(({ category }) => MARKETPLACE_CATEGORIES.includes(category))
      .sort(
        (a, b) =>
          MARKETPLACE_CATEGORIES.indexOf(a.category) -
          MARKETPLACE_CATEGORIES.indexOf(b.category),
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

    const backupsSection: SidebarSection = {
      title: "Backups",
      items: [
        { label: "Plans", to: "/console/backups/plans", icon: Archive },
        { label: "Backup Jobs", to: "/console/backups/backupjobs", icon: Archive },
        { label: "Backups", to: "/console/backups/backups", icon: Archive },
        { label: "Restore Jobs", to: "/console/backups/restorejobs", icon: Archive },
      ],
    }

    const administrationSection: SidebarSection = {
      title: "Administration",
      items: [
        ...(canSeeClusterUsage
          ? [{ label: "Cluster Usage", to: "/console/cluster-usage", icon: Gauge }]
          : []),
        ...(canManageBackupClasses
          ? [{ label: "Backups", to: "/console/backups/backupclasses", icon: Archive }]
          : []),
        { label: "Info", to: "/console/info", icon: Info },
        { label: "Modules", to: "/console/modules", icon: ToyBrick },
        { label: "External IPs", to: "/console/external-ips", icon: Globe },
        { label: "Tenants", to: "/console/tenants", icon: Users },
      ],
    }

    return [...categorySections, backupsSection, administrationSection]
  }, [grouped, canSeeClusterUsage, canManageBackupClasses])
}
