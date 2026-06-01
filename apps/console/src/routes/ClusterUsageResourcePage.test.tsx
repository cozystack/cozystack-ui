import { describe, it, expect, vi } from "vitest"
import { screen, within } from "@testing-library/react"
import { Route, Routes } from "react-router"
import {
  K8sClient,
  type K8sList,
  type APIGroupList,
} from "@cozystack/k8s-client"
import { ClusterUsageResourcePage } from "./ClusterUsageResourcePage.tsx"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

function node(name: string, resources: Record<string, string>) {
  return {
    apiVersion: "v1",
    kind: "Node",
    metadata: { name, creationTimestamp: "2026-05-25T00:00:00Z" },
    spec: {},
    status: {
      capacity: resources,
      allocatable: resources,
      conditions: [{ type: "Ready", status: "True" }],
    },
  }
}

const GPU = "nvidia.com/gpu"

function makeClient(nodes: unknown[]): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockImplementation(async (g, _v, plural) => {
    if (g === "metrics.k8s.io") {
      return { apiVersion: "metrics.k8s.io/v1beta1", kind: "NodeMetricsList", metadata: {}, items: [] } as K8sList<unknown>
    }
    if (plural === "nodes") {
      return { apiVersion: "v1", kind: "NodeList", metadata: {}, items: nodes } as K8sList<unknown>
    }
    // pods and anything else
    return { apiVersion: "v1", kind: `${plural}List`, metadata: {}, items: [] } as K8sList<unknown>
  })
  vi.spyOn(client, "getApiGroups").mockResolvedValue({
    kind: "APIGroupList",
    apiVersion: "v1",
    groups: [],
  } as APIGroupList)
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

describe("ClusterUsageResourcePage (per-node usage of a resource)", () => {
  it("renders one row per node that exposes the resource, with its capacity", async () => {
    const client = makeClient([
      node("cloud2", { [GPU]: "8" }),
      node("srv", { [GPU]: "8" }),
      // No GPU → must be excluded.
      node("plain", { cpu: "16" }),
    ])
    const { container } = renderResource(client, GPU)

    const cloud2 = (await screen.findByText("cloud2")).closest("tr") as HTMLElement
    // Capacity and Allocatable are both 8 for this node.
    expect(within(cloud2).getAllByText("8").length).toBeGreaterThanOrEqual(2)
    expect(container.querySelector('[data-node-row="srv"]')).not.toBeNull()
    expect(container.querySelector('[data-node-row="plain"]')).toBeNull()
  })

  it("shows an empty state when no node exposes the resource", async () => {
    const client = makeClient([node("plain", { cpu: "16" })])
    renderResource(client, GPU)
    expect(await screen.findByText(/no node exposes/i)).toBeInTheDocument()
  })

  it("renders the resource key as the page heading", async () => {
    const client = makeClient([node("cloud2", { [GPU]: "8" })])
    renderResource(client, GPU)
    expect(await screen.findByRole("heading", { name: GPU })).toBeInTheDocument()
  })

  it("links back to the Resources page", async () => {
    const client = makeClient([node("cloud2", { [GPU]: "8" })])
    renderResource(client, GPU)
    const back = await screen.findByRole("link", { name: /resources/i })
    expect(back).toHaveAttribute("href", "/admin/resources-usage")
  })
})
