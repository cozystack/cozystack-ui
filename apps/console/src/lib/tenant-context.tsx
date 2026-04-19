import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  useK8sList,
  type K8sResource,
} from "@cozystack/k8s-client"
import {
  APPS_GROUP,
  APPS_VERSION,
  type Tenant,
} from "@cozystack/types"
import {
  ROOT_TENANT_NAMESPACE,
  SELECTED_TENANT_KEY,
  tenantNamespace,
} from "./constants.ts"

interface TenantContextValue {
  tenants: Tenant[]
  selectedTenant: string | null
  selectTenant: (name: string) => void
  /** Namespace of the selected tenant's workloads (i.e. `tenant-<name>`). */
  tenantNamespace: string | null
  isLoading: boolean
  error: unknown
}

const TenantContext = createContext<TenantContextValue | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  // Cozystack tenants are organised as a tree — every Tenant resource lives in
  // the namespace of its parent tenant (root tenant sits in `tenant-root`).
  // For a first pass we just list the root tenant and its direct children; a
  // true recursive listing would need one call per namespace.
  const rootList = useK8sList<Tenant>({
    apiGroup: APPS_GROUP,
    apiVersion: APPS_VERSION,
    plural: "tenants",
    namespace: ROOT_TENANT_NAMESPACE,
  })

  const tenants = useMemo<Tenant[]>(() => {
    return (rootList.data?.items ?? []).slice().sort((a, b) =>
      a.metadata.name.localeCompare(b.metadata.name),
    )
  }, [rootList.data])

  const [selectedTenant, setSelectedTenant] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(SELECTED_TENANT_KEY)
  })

  // If the stored tenant is not (yet) in the list, fall back to the first one
  // we know about. Once the list loads we may adopt a persisted value.
  useEffect(() => {
    if (!tenants.length) return
    if (selectedTenant && tenants.some((t) => t.metadata.name === selectedTenant)) return
    const fallback =
      tenants.find((t) => t.metadata.name === "root")?.metadata.name ??
      tenants[0].metadata.name
    setSelectedTenant(fallback)
  }, [tenants, selectedTenant])

  const selectTenant = (name: string) => {
    setSelectedTenant(name)
    try {
      window.localStorage.setItem(SELECTED_TENANT_KEY, name)
    } catch {
      // ignore storage quota / private-mode failures
    }
  }

  const ns = selectedTenant ? tenantNamespace(selectedTenant) : null

  const value: TenantContextValue = {
    tenants,
    selectedTenant,
    selectTenant,
    tenantNamespace: ns,
    isLoading: rootList.isLoading,
    error: rootList.error,
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error("useTenantContext must be used inside TenantProvider")
  return ctx
}

/**
 * Returns the tenant namespace, throwing if the user has not selected a tenant
 * yet. Use this in routes that are gated on tenant selection.
 */
export function useRequiredTenantNamespace(): string {
  const { tenantNamespace } = useTenantContext()
  if (!tenantNamespace) {
    throw new Error("No tenant selected")
  }
  return tenantNamespace
}

// Re-export the k8s resource type for convenience in callers.
export type { K8sResource }
