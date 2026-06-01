import { describe, it, expect, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  K8sClient,
  K8sProvider,
  K8sApiError,
  type K8sList,
  type SelfSubjectAccessReview,
} from "@cozystack/k8s-client"
import type { ReactNode } from "react"
import { useConsoleSidebarSections } from "./sidebar-sections.tsx"

const emptyAppDefList: K8sList<unknown> = {
  apiVersion: "cozystack.io/v1alpha1",
  kind: "ApplicationDefinitionList",
  metadata: {},
  items: [],
}

function ssarResponse(allowed: boolean): SelfSubjectAccessReview {
  return {
    apiVersion: "authorization.k8s.io/v1",
    kind: "SelfSubjectAccessReview",
    metadata: { name: "" },
    spec: { resourceAttributes: { resource: "nodes", verb: "list" } },
    status: { allowed },
  }
}

interface ClientConfig {
  ssar?: SelfSubjectAccessReview | "pending" | K8sApiError
}

function makeClient(config: ClientConfig = {}): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockResolvedValue(emptyAppDefList as K8sList<unknown>)
  vi.spyOn(client, "create").mockImplementation(async () => {
    if (config.ssar === "pending") return new Promise(() => ({})) as never
    if (config.ssar instanceof K8sApiError) throw config.ssar
    return (config.ssar ?? ssarResponse(false)) as unknown
  })
  return client
}

function makeWrapper(client: K8sClient) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <K8sProvider client={client} queryClient={queryClient}>
          {children}
        </K8sProvider>
      </QueryClientProvider>
    )
  }
}

function findItem(sections: ReturnType<typeof useConsoleSidebarSections>, label: string) {
  for (const section of sections) {
    const found = section.items.find((i) => i.label === label)
    if (found) return found
  }
  return undefined
}

describe("useConsoleSidebarSections — Cluster Usage gate", () => {
  it("renders the Cluster Usage entry when SSAR allows nodes list", async () => {
    const client = makeClient({ ssar: ssarResponse(true) })
    const { result } = renderHook(() => useConsoleSidebarSections(), {
      wrapper: makeWrapper(client),
    })
    await waitFor(() =>
      expect(findItem(result.current, "Cluster Usage")).toBeDefined(),
    )
    expect(findItem(result.current, "Cluster Usage")?.to).toBe(
      "/console/cluster-usage",
    )
  })

  it("hides the Cluster Usage entry when SSAR denies nodes list", async () => {
    const client = makeClient({ ssar: ssarResponse(false) })
    const { result } = renderHook(() => useConsoleSidebarSections(), {
      wrapper: makeWrapper(client),
    })
    // Wait until the SSAR request has actually fired (so the absence is the
    // result of a deny, not of the query still being in flight) and the
    // gated entry is not present.
    await waitFor(() => {
      expect(client.create).toHaveBeenCalled()
      expect(findItem(result.current, "Cluster Usage")).toBeUndefined()
    })
  })

  it("hides the Cluster Usage entry while SSAR is still loading (no flicker)", () => {
    const client = makeClient({ ssar: "pending" })
    const { result } = renderHook(() => useConsoleSidebarSections(), {
      wrapper: makeWrapper(client),
    })
    expect(findItem(result.current, "Cluster Usage")).toBeUndefined()
  })

  it("hides the Cluster Usage entry on SSAR error", async () => {
    const client = makeClient({ ssar: new K8sApiError(500, "boom") })
    const { result } = renderHook(() => useConsoleSidebarSections(), {
      wrapper: makeWrapper(client),
    })
    // Wait until the failing SSAR request has fired and settled; the gated
    // entry must stay absent rather than relying on an arbitrary delay.
    await waitFor(() => {
      expect(client.create).toHaveBeenCalled()
      expect(findItem(result.current, "Cluster Usage")).toBeUndefined()
    })
  })
})

// The sidebar issues two SSARs (nodes/list for Cluster Usage, and
// backupclasses/update for Backup Classes); this client answers each by the
// requested resource so the two gates can be exercised independently.
function makeResourceClient(allow: Record<string, boolean>): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockResolvedValue(emptyAppDefList as K8sList<unknown>)
  vi.spyOn(client, "create").mockImplementation(async (_g, _v, _p, body) => {
    const resource =
      (body as SelfSubjectAccessReview).spec?.resourceAttributes?.resource ?? ""
    return {
      ...(body as object),
      status: { allowed: allow[resource] ?? false },
    } as unknown
  })
  return client
}

// The admin "Backups" entry collides by label with the per-tenant "Backups"
// item in the Backups group, so locate the admin one by section + URL.
function findAdminBackupsItem(
  sections: ReturnType<typeof useConsoleSidebarSections>,
) {
  const admin = sections.find((s) => s.title === "Administration")
  return admin?.items.find((i) => i.to === "/console/backups/backupclasses")
}

describe("useConsoleSidebarSections — Backup Classes gate", () => {
  it("shows the admin Backups entry when update on backupclasses is allowed", async () => {
    const client = makeResourceClient({ backupclasses: true })
    const { result } = renderHook(() => useConsoleSidebarSections(), {
      wrapper: makeWrapper(client),
    })
    await waitFor(() => {
      const item = findAdminBackupsItem(result.current)
      expect(item).toBeDefined()
      expect(item?.label).toBe("Backups")
    })
  })

  it("hides the admin Backups entry when update on backupclasses is denied (read-only tenant)", async () => {
    // list allowed, update denied — the read a tenant actually has must NOT
    // be enough to surface the admin entry.
    const client = makeResourceClient({ backupclasses: false })
    const { result } = renderHook(() => useConsoleSidebarSections(), {
      wrapper: makeWrapper(client),
    })
    await waitFor(() => {
      expect(client.create).toHaveBeenCalled()
      expect(findAdminBackupsItem(result.current)).toBeUndefined()
    })
    // The per-tenant "Backups" group item (different URL) remains visible.
    expect(findItem(result.current, "Plans")).toBeDefined()
  })
})
