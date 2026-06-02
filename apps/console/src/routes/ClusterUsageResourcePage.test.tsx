import { describe, it, expect, vi, beforeAll } from "vitest"
import { screen, within } from "@testing-library/react"
import { Route, Routes } from "react-router"
import { K8sClient, type K8sList } from "@cozystack/k8s-client"
import { ClusterUsageResourcePage } from "./ClusterUsageResourcePage.tsx"
import { TenantProvider } from "../lib/tenant-context.tsx"
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

function appDef(kind: string, plural: string) {
  return {
    apiVersion: "cozystack.io/v1alpha1",
    kind: "ApplicationDefinition",
    metadata: { name: plural },
    spec: { application: { kind, plural, singular: kind.toLowerCase() } },
  }
}

const GPU = "nvidia.com/gpu"

function makeClient(pods: unknown[], appDefs: unknown[] = []): K8sClient {
  const client = new K8sClient()
  vi.spyOn(client, "list").mockImplementation(async (_g, _v, plural) => {
    const items =
      plural === "applicationdefinitions"
        ? appDefs
        : plural === "tenantnamespaces"
          ? []
          : pods
    return {
      apiVersion: "v1",
      kind: `${plural}List`,
      metadata: {},
      items,
    } as K8sList<unknown>
  })
  return client
}

function renderResource(client: K8sClient, resource: string) {
  return renderWithK8sProvider(
    <TenantProvider>
      <Routes>
        <Route path="/r/*" element={<ClusterUsageResourcePage />} />
      </Routes>
    </TenantProvider>,
    { client, initialRoute: `/r/${resource}` },
  )
}

// TenantProvider reads window.localStorage on mount.
beforeAll(() => {
  if (typeof globalThis.localStorage?.getItem !== "function") {
    const store = new Map<string, string>()
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    })
  }
})

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
    // Kind is shown as a subtitle within the Workload cell.
    expect(within(tr).getByText("VMInstance")).toBeInTheDocument()
    const cells = tr.querySelectorAll("td")
    // Columns: Tenant | Workload | Requested — last cell is the summed request.
    expect(cells[cells.length - 1].textContent).toBe("3")
    expect(screen.queryByText("tenant-bar")).toBeNull()
  })

  it("links a consumer to its deployed application page in the Console", async () => {
    const client = makeClient(
      [
        pod(
          "tenant-root",
          "demo-vm-launcher",
          {
            "apps.cozystack.io/application.kind": "VMInstance",
            "apps.cozystack.io/application.name": "demo-vm",
          },
          [{ [GPU]: "1" }],
        ),
      ],
      [appDef("VMInstance", "vminstances")],
    )
    renderResource(client, GPU)

    const link = await screen.findByRole("link", { name: "demo-vm" })
    expect(link).toHaveAttribute("href", "/console/vminstances/demo-vm/workloads")
  })

  it("does not link a consumer whose kind is not a known application", async () => {
    const client = makeClient(
      [
        pod("tenant-root", "rogue", { "app.kubernetes.io/instance": "rogue" }, [
          { [GPU]: "1" },
        ]),
      ],
      [appDef("VMInstance", "vminstances")],
    )
    renderResource(client, GPU)
    // Owner falls back to the Helm instance label; with no matching app
    // definition it must render as plain text, not a link.
    await screen.findByText("rogue")
    expect(screen.queryByRole("link", { name: "rogue" })).toBeNull()
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
