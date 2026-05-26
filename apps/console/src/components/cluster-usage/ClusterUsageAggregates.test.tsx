import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ClusterUsageAggregates } from "./ClusterUsageAggregates.tsx"
import type { AggregateResources } from "../../lib/cluster-usage/types.ts"

function empty(): AggregateResources {
  return {
    standard: {
      cpu: { capacity: 0, allocatable: 0, requested: 0 },
      memory: { capacity: 0, allocatable: 0, requested: 0 },
      "ephemeral-storage": { capacity: 0, allocatable: 0, requested: 0 },
      pods: { capacity: 0, allocatable: 0, requested: 0 },
    },
    extended: {},
  }
}

describe("ClusterUsageAggregates", () => {
  it("renders the four standard cards in order CPU, Memory, Storage, Pods", () => {
    render(<ClusterUsageAggregates aggregates={empty()} />)
    const headings = screen.getAllByText(/CPU|Memory|Storage|Pods/i)
    const labels = headings.map((h) => h.textContent)
    expect(labels).toEqual(
      expect.arrayContaining(["CPU", "Memory", "Storage", "Pods"]),
    )
  })

  it("does not render the extended-resources section when none are present", () => {
    render(<ClusterUsageAggregates aggregates={empty()} />)
    expect(screen.queryByText(/extended resources/i)).toBeNull()
  })

  it("renders one card per extended-resource key with the full key as the title", () => {
    const agg = empty()
    agg.extended["nvidia.com/gpu"] = { capacity: 4, allocatable: 4, requested: 1 }
    agg.extended["amd.com/gpu"] = { capacity: 2, allocatable: 2, requested: 0 }
    render(<ClusterUsageAggregates aggregates={agg} />)
    expect(screen.getByText("nvidia.com/gpu")).toBeInTheDocument()
    expect(screen.getByText("amd.com/gpu")).toBeInTheDocument()
  })

  it("sorts extended-resource cards alphabetically by key", () => {
    const agg = empty()
    agg.extended["nvidia.com/gpu"] = { capacity: 4, allocatable: 4, requested: 1 }
    agg.extended["amd.com/gpu"] = { capacity: 2, allocatable: 2, requested: 0 }
    const { container } = render(<ClusterUsageAggregates aggregates={agg} />)
    const titles = Array.from(container.querySelectorAll('[data-extended-card]')).map(
      (el) => el.getAttribute("data-extended-card"),
    )
    expect(titles).toEqual(["amd.com/gpu", "nvidia.com/gpu"])
  })

  it("does not render a 'Used' line on any card when no card has used data", () => {
    render(<ClusterUsageAggregates aggregates={empty()} />)
    expect(screen.queryByText(/used/i)).toBeNull()
  })

  it("renders the 'Used' line on standard cards when usage data is present", () => {
    const agg = empty()
    agg.standard.cpu = { capacity: 8, allocatable: 8, requested: 2, used: 1 }
    agg.standard.memory = { capacity: 16 * 1024 ** 3, allocatable: 16 * 1024 ** 3, requested: 0, used: 4 * 1024 ** 3 }
    render(<ClusterUsageAggregates aggregates={agg} />)
    expect(screen.getAllByText(/used/i).length).toBeGreaterThan(0)
  })
})
