import { describe, it, expect } from "vitest"
import { render as rtlRender, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router"
import { ClusterUsageTable } from "./ClusterUsageTable.tsx"
import type { NodeRow } from "../../lib/cluster-usage/types.ts"

// The table now renders <Link>s for resource row labels, so every render
// needs a router context.
function render(ui: Parameters<typeof rtlRender>[0]) {
  return rtlRender(<MemoryRouter>{ui}</MemoryRouter>)
}

function row(name: string, overrides: Partial<NodeRow> = {}): NodeRow {
  return {
    name,
    ready: true,
    schedulable: true,
    pressureConditions: [],
    roles: [],
    taints: [],
    age: "1d",
    creationTimestamp: "2026-05-25T00:00:00Z",
    standard: {
      cpu: { capacity: 8, allocatable: 8, requested: 1 },
      memory: { capacity: 16 * 1024 ** 3, allocatable: 16 * 1024 ** 3, requested: 0 },
      "ephemeral-storage": { capacity: 0, allocatable: 0, requested: 0 },
      pods: { capacity: 110, allocatable: 110, requested: 0 },
    },
    extended: {},
    ...overrides,
  }
}

function attrRow(container: HTMLElement, key: string): HTMLElement {
  return container.querySelector(`[data-attribute-row="${key}"]`) as HTMLElement
}

describe("ClusterUsageTable (transposed: nodes are columns)", () => {
  it("renders one column per node, sorted by name ascending", () => {
    const { container } = render(
      <ClusterUsageTable rows={[row("worker-b"), row("worker-a")]} extendedKeys={[]} />,
    )
    const headers = within(container.querySelector("thead")!)
      .getAllByRole("columnheader")
      .map((h) => h.textContent)
    expect(headers).toEqual(["Node", "worker-a", "worker-b"])
  })

  it("lays out attributes top-to-bottom: Status, Roles, CPU, Memory, extended…, Age", () => {
    const { container } = render(
      <ClusterUsageTable
        rows={[row("n", { extended: { "nvidia.com/gpu": { capacity: 2, allocatable: 2, requested: 1 } } })]}
        extendedKeys={["nvidia.com/gpu", "amd.com/gpu"]}
      />,
    )
    const order = Array.from(container.querySelectorAll("[data-attribute-row]")).map((el) =>
      el.getAttribute("data-attribute-row"),
    )
    expect(order).toEqual([
      "status",
      "roles",
      "cpu",
      "memory",
      "nvidia.com/gpu",
      "amd.com/gpu",
      "age",
    ])
  })

  it("links resource row labels (CPU, Memory, extended) to the per-resource drill-down", () => {
    render(
      <ClusterUsageTable
        rows={[row("n", { extended: { "nvidia.com/gpu": { capacity: 2, allocatable: 2, requested: 1 } } })]}
        extendedKeys={["nvidia.com/gpu"]}
      />,
    )
    expect(screen.getByRole("link", { name: "CPU" })).toHaveAttribute(
      "href",
      "/admin/capacity/cluster/r/cpu",
    )
    expect(screen.getByRole("link", { name: "Memory" })).toHaveAttribute(
      "href",
      "/admin/capacity/cluster/r/memory",
    )
    expect(screen.getByRole("link", { name: "nvidia.com/gpu" })).toHaveAttribute(
      "href",
      "/admin/capacity/cluster/r/nvidia.com/gpu",
    )
    // Non-resource attribute rows are not links.
    expect(screen.queryByRole("link", { name: "Status" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Age" })).toBeNull()
  })

  it("shows Ready / NotReady / SchedulingDisabled in the Status row", () => {
    const { container } = render(
      <ClusterUsageTable
        rows={[
          row("ok", { ready: true }),
          row("bad", { ready: false }),
          row("cordoned", { schedulable: false }),
        ]}
        extendedKeys={[]}
      />,
    )
    const status = attrRow(container, "status")
    expect(within(status).getByText("Ready")).toBeInTheDocument()
    expect(within(status).getByText("NotReady")).toBeInTheDocument()
    expect(within(status).getByText(/scheduling.?disabled/i)).toBeInTheDocument()
  })

  it("flags pressure conditions with a chip", () => {
    render(
      <ClusterUsageTable
        rows={[row("pressured", { pressureConditions: ["MemoryPressure"] })]}
        extendedKeys={[]}
      />,
    )
    expect(screen.getByText("MemoryPressure")).toBeInTheDocument()
  })

  it("renders roles inline, em dash for nodes without roles", () => {
    const { container } = render(
      <ClusterUsageTable
        rows={[row("cp", { roles: ["control-plane"] }), row("worker", { roles: [] })]}
        extendedKeys={[]}
      />,
    )
    const roles = attrRow(container, "roles")
    expect(within(roles).getByText("control-plane")).toBeInTheDocument()
    expect(within(roles).getByText("—")).toBeInTheDocument()
  })

  it("renders the Age row verbatim from row.age", () => {
    const { container } = render(
      <ClusterUsageTable rows={[row("with-age", { age: "21h" })]} extendedKeys={[]} />,
    )
    expect(within(attrRow(container, "age")).getByText("21h")).toBeInTheDocument()
  })

  it("renders em dash in an extended-resource row for a node that does not expose it", () => {
    const { container } = render(
      <ClusterUsageTable rows={[row("plain", { extended: {} })]} extendedKeys={["nvidia.com/gpu"]} />,
    )
    expect(within(attrRow(container, "nvidia.com/gpu")).getByText("—")).toBeInTheDocument()
  })

  it("collapses extended-resource cells to em dash for a NotReady node", () => {
    const gpu = { "nvidia.com/gpu": { capacity: 2, allocatable: 2, requested: 1 } }
    const { container } = render(
      <ClusterUsageTable
        rows={[row("ready-gpu", { ready: true, extended: gpu }), row("down-gpu", { ready: false, extended: gpu })]}
        extendedKeys={["nvidia.com/gpu"]}
      />,
    )
    const gpuRow = attrRow(container, "nvidia.com/gpu")
    // Only the Ready node surfaces its capacity-derived number.
    expect(within(gpuRow).getAllByText("capacity 2")).toHaveLength(1)
  })

  it("renders em dashes in the CPU and Memory rows when the node is NotReady", () => {
    const { container } = render(
      <ClusterUsageTable rows={[row("dead", { ready: false })]} extendedKeys={[]} />,
    )
    expect(within(attrRow(container, "cpu")).getByText("—")).toBeInTheDocument()
    expect(within(attrRow(container, "memory")).getByText("—")).toBeInTheDocument()
  })

  it("hides a node column when filtered out by name (case-insensitive)", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ClusterUsageTable
        rows={[row("worker-cpu-1"), row("worker-gpu-1"), row("ctrl-1")]}
        extendedKeys={[]}
      />,
    )
    await user.type(screen.getByLabelText("Filter nodes"), "GPU")
    const headers = within(container.querySelector("thead")!)
      .getAllByRole("columnheader")
      .map((h) => h.textContent)
    expect(headers).toEqual(["Node", "worker-gpu-1"])
  })

  it("filters node columns by role substring", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ClusterUsageTable
        rows={[row("a", { roles: ["control-plane"] }), row("b", { roles: ["worker"] })]}
        extendedKeys={[]}
      />,
    )
    await user.type(screen.getByLabelText("Filter nodes"), "control")
    const headers = within(container.querySelector("thead")!)
      .getAllByRole("columnheader")
      .map((h) => h.textContent)
    expect(headers).toEqual(["Node", "a"])
  })

  it("replaces the Requested line with an em-dash tooltip when podsUnavailable", () => {
    const { container } = render(
      <ClusterUsageTable
        rows={[
          row("loaded", {
            standard: {
              cpu: { capacity: 8, allocatable: 8, requested: 4 },
              memory: { capacity: 16 * 1024 ** 3, allocatable: 16 * 1024 ** 3, requested: 0 },
              "ephemeral-storage": { capacity: 0, allocatable: 0, requested: 0 },
              pods: { capacity: 110, allocatable: 110, requested: 0 },
            },
          }),
        ]}
        extendedKeys={[]}
        podsUnavailable
      />,
    )
    const cpu = attrRow(container, "cpu")
    expect(
      cpu.querySelectorAll('[title="Requires cluster-wide pod read access"]').length,
    ).toBeGreaterThan(0)
    expect(within(cpu).queryByText(/4 \/ 8 req/)).toBeNull()
  })
})
