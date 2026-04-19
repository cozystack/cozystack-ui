import { useMemo } from "react"
import {
  useK8sList,
  type ResourceRef,
  type K8sList,
} from "@cozystack/k8s-client"
import {
  COZYSTACK_GROUP,
  COZYSTACK_VERSION,
  APPS_GROUP,
  APPS_VERSION,
  type ApplicationDefinition,
  type ApplicationInstance,
} from "@cozystack/types"

const APPLICATION_DEFINITIONS_REF: ResourceRef = {
  apiGroup: COZYSTACK_GROUP,
  apiVersion: COZYSTACK_VERSION,
  plural: "applicationdefinitions",
}

export function useApplicationDefinitions() {
  return useK8sList<ApplicationDefinition>(APPLICATION_DEFINITIONS_REF)
}

export function useApplicationDefinition(name: string | undefined) {
  const list = useApplicationDefinitions()
  return {
    ...list,
    data: useMemo(
      () => (name ? list.data?.items.find((i) => i.metadata.name === name) : undefined),
      [list.data, name],
    ),
  }
}

export function appInstanceRef(ad: ApplicationDefinition, namespace?: string): ResourceRef {
  return {
    apiGroup: APPS_GROUP,
    apiVersion: APPS_VERSION,
    plural: ad.spec?.application.plural ?? "",
    namespace,
  }
}

export function useApplicationInstances(
  ad: ApplicationDefinition | undefined,
  namespace: string | undefined,
) {
  return useK8sList<ApplicationInstance>(
    {
      apiGroup: APPS_GROUP,
      apiVersion: APPS_VERSION,
      plural: ad?.spec?.application.plural ?? "",
      namespace,
    },
    { enabled: !!ad && !!namespace && !!ad.spec?.application.plural },
  )
}

/**
 * Group application definitions by `dashboard.category`. Undefined category is
 * bucketed under "Other". Results are stable-sorted by display name within a
 * category and categories are returned in alphabetical order.
 */
export function groupByCategory(
  list: K8sList<ApplicationDefinition> | undefined,
): { category: string; items: ApplicationDefinition[] }[] {
  if (!list) return []
  const map = new Map<string, ApplicationDefinition[]>()
  for (const ad of list.items) {
    const category = ad.spec?.dashboard?.category ?? "Other"
    const bucket = map.get(category) ?? []
    bucket.push(ad)
    map.set(category, bucket)
  }
  return [...map.entries()]
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

export function iconDataUrl(ad: ApplicationDefinition): string | undefined {
  const icon = ad.spec?.dashboard?.icon
  if (!icon) return undefined
  return `data:image/svg+xml;base64,${icon}`
}

export function appDisplayName(ad: ApplicationDefinition): string {
  return ad.spec?.application.kind ?? ad.metadata.name
}

/**
 * The release prefix (usually `<kind>-`) is prepended to every resource created
 * by the application chart (Deployments, Services, Secrets, ...). We use it to
 * narrow list queries when we render a deployed application detail page.
 */
export function releasePrefix(ad: ApplicationDefinition): string {
  return ad.spec?.release?.prefix ?? `${ad.spec?.application.singular ?? ad.metadata.name}-`
}
