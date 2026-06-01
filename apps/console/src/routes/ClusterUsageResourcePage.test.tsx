import { describe, it, expect, vi } from "vitest"
import { screen, within } from "@testing-library/react"
import { Route, Routes } from "react-router"
import { K8sClient, type K8sList } from "@cozystack/k8s-client"
import { ClusterUsageResourcePage } from "./ClusterUsageResourcePage.tsx"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

function pod(
  namespace: string,
  name: string,
  labels: Record<string, string>,
  requests: Record<string, string>[],
) {
  return {
    apiVersion: "v1",
    kind: "Pod",
    metadata: { name, namespace, labels },
    spec: {
      containers: requests.map((r, i) => ({
        name: `c${i}`,
        resources: { requests: r },
      })),
    },
    status: { phase: "Running" },
  }
}

const GPU = "nvidia.com/gpu"

function makeClient(pods: unknown[]): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockResolvedValue({
    apiVersion: "v1",
    kind: "PodList",
    metadata: {},
    items: pods,
  } as K8sList<unknown>)
  return client
}

function renderResource(client: K8sClient, resource: string) {
  return renderWithK8sProvider(
    <Routes>
      <Route path="/r/*" element={<ClusterUsageResourcePage />} />
    </Routes>,
    { client, initialRoute: `/r/${resource}` },
  )
}

describe("ClusterUsageResourcePage", () => {
  it("groups consumers of a resource by tenant namespace and owning app, summing requests", async () => {
    const client = makeClient([
      pod(
        "tenant-foo",
        "vm1-abc",
        {
          "apps.cozystack.io/application.kind": "VMInstance",
          "apps.cozystack.io/application.name": "vm1",
        },
        [{ [GPU]: "2" }],
      ),
      pod(
        "tenant-foo",
        "vm1-def",
        {
          "apps.cozystack.io/application.kind": "VMInstance",
          "apps.cozystack.io/application.name": "vm1",
        },
        [{ [GPU]: "1" }],
      ),
      // No GPU request → must be excluded.
      pod("tenant-bar", "web-1", { "app.kubernetes.io/instance": "web" }, [
        { cpu: "500m" },
      ]),
    ])
    renderResource(client, GPU)

    const row = await screen.findByText("vm1")
    const tr = row.closest("tr") as HTMLElement
    expect(within(tr).getByText("tenant-foo")).toBeInTheDocument()
    expect(within(tr).getByText("VMInstance")).toBeInTheDocument()
    // Two pods, 2 + 1 = 3 GPUs requested.
    const cells = tr.querySelectorAll("td")
    expect(cells[cells.length - 2].textContent).toBe("2")
    expect(cells[cells.length - 1].textContent).toBe("3")

    // The non-consuming tenant must not appear.
    expect(screen.queryByText("tenant-bar")).toBeNull()
  })

  it("shows an empty state when nothing requests the resource", async () => {
    const client = makeClient([
      pod("tenant-bar", "web-1", { "app.kubernetes.io/instance": "web" }, [
        { cpu: "500m" },
      ]),
    ])
    renderResource(client, GPU)
    expect(
      await screen.findByText(/no workloads are requesting/i),
    ).toBeInTheDocument()
  })

  it("renders the resource key as the page heading", async () => {
    const client = makeClient([])
    renderResource(client, GPU)
    expect(await screen.findByRole("heading", { name: GPU })).toBeInTheDocument()
  })
})
