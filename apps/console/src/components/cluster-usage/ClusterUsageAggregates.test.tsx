import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ClusterUsageAggregates } from "./ClusterUsageAggregates.tsx"
import type { AggregateResources } from "../../lib/cluster-usage/types.ts"
import type { NodeSummary } from "../../hooks/useClusterUsageData.tsx"

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

function summary(overrides: Partial<NodeSummary> = {}): NodeSummary {
  return { total: 0, ready: 0, notReady: 0, schedulingDisabled: 0, ...overrides }
}

describe("ClusterUsageAggregates", () => {
  it("renders the node-summary header line", () => {
    render(
      <ClusterUsageAggregates
        aggregates={empty()}
        nodeSummary={summary({ total: 12, ready: 10, notReady: 1, schedulingDisabled: 1 })}
      />,
    )
    expect(screen.getByText("12 nodes")).toBeInTheDocument()
    expect(
      screen.getByText(/10 Ready · 1 NotReady · 1 SchedulingDisabled/),
    ).toBeInTheDocument()
  })

  it("uses singular 'node' in the header for a one-node cluster", () => {
    render(
      <ClusterUsageAggregates
        aggregates={empty()}
        nodeSummary={summary({ total: 1, ready: 1 })}
      />,
    )
    expect(screen.getByText("1 node")).toBeInTheDocument()
  })

  it("renders the four standard cards in order CPU, Memory, Storage, Pods", () => {
    render(<ClusterUsageAggregates aggregates={empty()} nodeSummary={summary()} />)
    const headings = screen.getAllByText(/^(CPU|Memory|Storage|Pods)$/)
    const labels = headings.map((h) => h.textContent)
    // Exact array (not arrayContaining) so the card order is actually pinned.
    expect(labels).toEqual(["CPU", "Memory", "Storage", "Pods"])
  })

  it("does not render the extended-resources section when none are present", () => {
    render(<ClusterUsageAggregates aggregates={empty()} nodeSummary={summary()} />)
    expect(screen.queryByText(/extended resources/i)).toBeNull()
  })

  it("renders one card per extended-resource key with the full key as the title", () => {
    const agg = empty()
    agg.extended["nvidia.com/gpu"] = { capacity: 4, allocatable: 4, requested: 1 }
    agg.extended["amd.com/gpu"] = { capacity: 2, allocatable: 2, requested: 0 }
    render(<ClusterUsageAggregates aggregates={agg} nodeSummary={summary()} />)
    expect(screen.getByText("nvidia.com/gpu")).toBeInTheDocument()
    expect(screen.getByText("amd.com/gpu")).toBeInTheDocument()
  })

  it("sorts extended-resource cards alphabetically by key", () => {
    const agg = empty()
    agg.extended["nvidia.com/gpu"] = { capacity: 4, allocatable: 4, requested: 1 }
    agg.extended["amd.com/gpu"] = { capacity: 2, allocatable: 2, requested: 0 }
    const { container } = render(
      <ClusterUsageAggregates aggregates={agg} nodeSummary={summary()} />,
    )
    const titles = Array.from(container.querySelectorAll('[data-extended-card]')).map(
      (el) => el.getAttribute("data-extended-card"),
    )
    expect(titles).toEqual(["amd.com/gpu", "nvidia.com/gpu"])
  })

  it("does not render a 'Used' line on any card when no card has used data", () => {
    render(<ClusterUsageAggregates aggregates={empty()} nodeSummary={summary()} />)
    expect(screen.queryByText(/used/i)).toBeNull()
  })

  it("renders the 'Used' line on standard cards when usage data is present", () => {
    const agg = empty()
    agg.standard.cpu = { capacity: 8, allocatable: 8, requested: 2, used: 1 }
    agg.standard.memory = {
      capacity: 16 * 1024 ** 3,
      allocatable: 16 * 1024 ** 3,
      requested: 0,
      used: 4 * 1024 ** 3,
    }
    render(<ClusterUsageAggregates aggregates={agg} nodeSummary={summary()} />)
    expect(screen.getAllByText(/used/i).length).toBeGreaterThan(0)
  })

  it("replaces Requested numbers with an em-dash tooltip when pods are unavailable", () => {
    const agg = empty()
    agg.standard.cpu = { capacity: 8, allocatable: 8, requested: 3 }
    render(
      <ClusterUsageAggregates
        aggregates={agg}
        nodeSummary={summary({ total: 1, ready: 1 })}
        podsUnavailable
      />,
    )
    // The numeric Requested value should not be visible; em dashes appear
    // and at least one element has the explanatory tooltip on title.
    const tooltipNodes = document.querySelectorAll(
      '[title="Requires cluster-wide pod read access"]',
    )
    expect(tooltipNodes.length).toBeGreaterThan(0)
  })
})
