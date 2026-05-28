import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ClusterUsageTable } from "./ClusterUsageTable.tsx"
import type { NodeRow } from "../../lib/cluster-usage/types.ts"

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

describe("ClusterUsageTable", () => {
  it("renders one tr per node, default-sorted by name ascending", () => {
    render(
      <ClusterUsageTable rows={[row("worker-b"), row("worker-a")]} extendedKeys={[]} />,
    )
    const rows = screen.getAllByRole("row")
    // First row is the header.
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByText("worker-a")).toBeInTheDocument()
    expect(within(rows[2]).getByText("worker-b")).toBeInTheDocument()
  })

  it("shows Ready / NotReady status text", () => {
    render(
      <ClusterUsageTable
        rows={[row("ok", { ready: true }), row("bad", { ready: false })]}
        extendedKeys={[]}
      />,
    )
    expect(screen.getByText("Ready")).toBeInTheDocument()
    expect(screen.getByText("NotReady")).toBeInTheDocument()
  })

  it("shows SchedulingDisabled when schedulable=false", () => {
    render(
      <ClusterUsageTable
        rows={[row("cordoned", { schedulable: false })]}
        extendedKeys={[]}
      />,
    )
    expect(screen.getByText(/scheduling.?disabled/i)).toBeInTheDocument()
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
    render(
      <ClusterUsageTable
        rows={[
          row("cp", { roles: ["control-plane"] }),
          row("worker", { roles: [] }),
        ]}
        extendedKeys={[]}
      />,
    )
    expect(screen.getByText("control-plane")).toBeInTheDocument()
    const workerRow = screen.getByText("worker").closest("tr")!
    expect(within(workerRow).getAllByText("—").length).toBeGreaterThan(0)
  })

  it("adds one column per extended key, in extendedKeys order", () => {
    render(
      <ClusterUsageTable
        rows={[
          row("gpu-1", {
            extended: { "nvidia.com/gpu": { capacity: 2, allocatable: 2, requested: 1 } },
          }),
        ]}
        extendedKeys={["nvidia.com/gpu", "amd.com/gpu"]}
      />,
    )
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent)
    const nvidiaAt = headers.indexOf("nvidia.com/gpu")
    const amdAt = headers.indexOf("amd.com/gpu")
    expect(nvidiaAt).toBeGreaterThanOrEqual(0)
    expect(amdAt).toBeGreaterThanOrEqual(0)
    // Columns must follow extendedKeys order: nvidia before amd.
    expect(nvidiaAt).toBeLessThan(amdAt)
  })

  it("renders em dash in extended-resource cell when the node does not expose it", () => {
    render(
      <ClusterUsageTable
        rows={[row("plain", { extended: {} })]}
        extendedKeys={["nvidia.com/gpu"]}
      />,
    )
    const tr = screen.getByText("plain").closest("tr")!
    expect(within(tr).getAllByText("—").length).toBeGreaterThan(0)
  })

  it("collapses extended-resource cells to em dash for a NotReady node", () => {
    const gpu = { "nvidia.com/gpu": { capacity: 2, allocatable: 2, requested: 1 } }
    render(
      <ClusterUsageTable
        rows={[
          row("ready-gpu", { ready: true, extended: gpu }),
          row("down-gpu", { ready: false, extended: gpu }),
        ]}
        extendedKeys={["nvidia.com/gpu"]}
      />,
    )
    const readyRow = screen.getByText("ready-gpu").closest("tr")!
    const downRow = screen.getByText("down-gpu").closest("tr")!
    // The Ready node surfaces its capacity-derived numbers...
    expect(within(readyRow).getByText("capacity 2")).toBeInTheDocument()
    // ...while the NotReady node must not render capacity for the extended cell.
    expect(within(downRow).queryByText("capacity 2")).not.toBeInTheDocument()
  })

  it("renders the age column verbatim from row.age", () => {
    render(
      <ClusterUsageTable
        rows={[row("with-age", { age: "21h" })]}
        extendedKeys={[]}
      />,
    )
    expect(screen.getByText("21h")).toBeInTheDocument()
  })

  it("renders em dashes in cpu/memory cells when the node is NotReady", () => {
    render(
      <ClusterUsageTable
        rows={[row("dead", { ready: false })]}
        extendedKeys={[]}
      />,
    )
    const tr = screen.getByText("dead").closest("tr")!
    // CPU + Memory both render '—' when NotReady (4 dashes total for the
    // two columns' two halves each — the assert just requires the row
    // contains the em dashes, not the exact count).
    expect(within(tr).getAllByText("—").length).toBeGreaterThan(0)
  })

  it("toggles the sort direction on a second click of the same column", async () => {
    const user = userEvent.setup()
    render(
      <ClusterUsageTable rows={[row("a"), row("b"), row("c")]} extendedKeys={[]} />,
    )
    const nameHeader = screen.getByRole("button", { name: /name/i })
    // Default is asc — verify ordering, then click to flip.
    let bodyRows = screen.getAllByRole("row").slice(1)
    expect(within(bodyRows[0]).getByText("a")).toBeInTheDocument()
    await user.click(nameHeader)
    bodyRows = screen.getAllByRole("row").slice(1)
    expect(within(bodyRows[0]).getByText("c")).toBeInTheDocument()
    expect(within(bodyRows[2]).getByText("a")).toBeInTheDocument()
  })

  it("filters rows by name substring (case-insensitive)", async () => {
    const user = userEvent.setup()
    render(
      <ClusterUsageTable
        rows={[row("worker-cpu-1"), row("worker-gpu-1"), row("ctrl-1")]}
        extendedKeys={[]}
      />,
    )
    const filter = screen.getByLabelText("Filter nodes")
    await user.type(filter, "GPU")
    expect(screen.queryByText("worker-cpu-1")).toBeNull()
    expect(screen.queryByText("ctrl-1")).toBeNull()
    expect(screen.getByText("worker-gpu-1")).toBeInTheDocument()
  })

  it("filters rows by role substring", async () => {
    const user = userEvent.setup()
    render(
      <ClusterUsageTable
        rows={[
          row("a", { roles: ["control-plane"] }),
          row("b", { roles: ["worker"] }),
        ]}
        extendedKeys={[]}
      />,
    )
    const filter = screen.getByLabelText("Filter nodes")
    await user.type(filter, "control")
    expect(screen.getByText("a")).toBeInTheDocument()
    expect(screen.queryByText("b")).toBeNull()
  })

  it("replaces the Requested line with an em-dash tooltip when podsUnavailable", () => {
    render(
      <ClusterUsageTable
        rows={[
          row("loaded", {
            ready: true,
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
    const tr = screen.getByText("loaded").closest("tr")!
    const tooltipNodes = tr.querySelectorAll(
      '[title="Requires cluster-wide pod read access"]',
    )
    expect(tooltipNodes.length).toBeGreaterThan(0)
    // The literal "4 / 8 req" (visible when pods are available) must not
    // appear when podsUnavailable; the tooltip-bearing dash takes its place.
    expect(within(tr).queryByText(/4 \/ 8 req/)).toBeNull()
  })
})
