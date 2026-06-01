import { describe, it, expect, vi } from "vitest"
import { screen, within, waitFor } from "@testing-library/react"
import { K8sClient, type K8sList } from "@cozystack/k8s-client"
import { ClusterStorageSection } from "./ClusterStorageSection.tsx"
import { renderWithK8sProvider } from "../../test-utils/render.tsx"

let pvcSeq = 0
function pvc(namespace: string, storageClassName: string, requested: string, capacity?: string) {
  return {
    apiVersion: "v1",
    kind: "PersistentVolumeClaim",
    metadata: { name: `pvc-${pvcSeq++}`, namespace },
    spec: { storageClassName, resources: { requests: { storage: requested } } },
    status: { phase: "Bound", capacity: capacity ? { storage: capacity } : undefined },
  }
}

function makeClient(pvcs: unknown[]): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockImplementation(async (_g, _v, plural) => {
    return {
      apiVersion: "v1",
      kind: `${plural}List`,
      metadata: {},
      items: plural === "persistentvolumeclaims" ? pvcs : [],
    } as K8sList<unknown>
  })
  return client
}

describe("ClusterStorageSection", () => {
  it("aggregates tenant PVCs by storage class and excludes non-tenant namespaces", async () => {
    const client = makeClient([
      pvc("tenant-foo", "replicated", "5Gi"),
      pvc("tenant-bar", "replicated", "10Gi"),
      // System namespace must be excluded.
      pvc("cozy-system", "replicated", "100Gi"),
    ])
    const { container } = renderWithK8sProvider(<ClusterStorageSection />, { client })
    const row = await waitForRow(container, "replicated")
    // Two tenant PVCs (the cozy-system one is excluded).
    expect(within(row).getByText("2")).toBeInTheDocument()
  })

  it("links a storage class to its per-class drill-down", async () => {
    const client = makeClient([pvc("tenant-foo", "replicated", "5Gi")])
    renderWithK8sProvider(<ClusterStorageSection />, { client })
    const link = await screen.findByRole("link", { name: "replicated" })
    expect(link).toHaveAttribute("href", "/admin/capacity/cluster/sc/replicated")
  })

  it("shows an empty state when no tenant PVCs exist", async () => {
    const client = makeClient([pvc("cozy-system", "replicated", "100Gi")])
    renderWithK8sProvider(<ClusterStorageSection />, { client })
    expect(
      await screen.findByText(/no persistent volume claims found/i),
    ).toBeInTheDocument()
  })
})

async function waitForRow(container: HTMLElement, sc: string): Promise<HTMLElement> {
  await waitFor(() =>
    expect(container.querySelector(`[data-storageclass-row="${sc}"]`)).not.toBeNull(),
  )
  return container.querySelector(`[data-storageclass-row="${sc}"]`) as HTMLElement
}
