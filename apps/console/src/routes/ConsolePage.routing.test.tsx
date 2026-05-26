import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import {
  K8sClient,
  type K8sList,
  type APIGroupList,
} from "@cozystack/k8s-client"
import { ConsolePage } from "./ConsolePage.tsx"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

function makeClient(): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockImplementation(async (_g, _v, plural) => {
    if (plural === "tenantnamespaces") {
      return {
        apiVersion: "core.cozystack.io/v1alpha1",
        kind: "TenantNamespaceList",
        metadata: {},
        items: [],
      } as K8sList<unknown>
    }
    return {
      apiVersion: "v1",
      kind: `${plural}List`,
      metadata: {},
      items: [],
    } as K8sList<unknown>
  })
  vi.spyOn(client, "getApiGroups").mockResolvedValue({
    kind: "APIGroupList",
    apiVersion: "v1",
    groups: [],
  } as APIGroupList)
  vi.spyOn(client, "create").mockResolvedValue({
    apiVersion: "authorization.k8s.io/v1",
    kind: "SelfSubjectAccessReview",
    metadata: { name: "" },
    spec: {},
    status: { allowed: false },
  } as unknown)
  return client
}

describe("ConsolePage routing", () => {
  it("renders ClusterUsagePage at /cluster-usage", async () => {
    const client = makeClient()
    renderWithK8sProvider(<ConsolePage />, {
      client,
      initialRoute: "/cluster-usage",
    })
    expect(await screen.findByText("Cluster Usage")).toBeInTheDocument()
  })
})
