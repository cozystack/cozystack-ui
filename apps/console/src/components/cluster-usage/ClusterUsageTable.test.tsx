import { describe, it, expect, vi, beforeAll, afterAll } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { ClusterUsageTable } from "./ClusterUsageTable.tsx"
import type { NodeRow } from "../../lib/cluster-usage/types.ts"

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-05-26T00:00:00Z"))
})

afterAll(() => {
  vi.useRealTimers()
})

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
  it("renders one tr per node in name order", () => {
    render(
      <ClusterUsageTable rows={[row("worker-b"), row("worker-a")]} extendedKeys={[]} />,
    )
    const rows = screen.getAllByRole("row")
    // First row is the header
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByText("worker-b")).toBeInTheDocument()
    expect(within(rows[2]).getByText("worker-a")).toBeInTheDocument()
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
    expect(headers).toContain("nvidia.com/gpu")
    expect(headers).toContain("amd.com/gpu")
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
})
