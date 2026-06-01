import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { ResourceCard } from "./ResourceCard.tsx"

describe("ResourceCard", () => {
  it("renders the title verbatim", () => {
    render(
      <ResourceCard
        title="nvidia.com/gpu"
        format="count"
        totals={{ capacity: 4, allocatable: 4, requested: 2 }}
      />,
    )
    expect(screen.getByText("nvidia.com/gpu")).toBeInTheDocument()
  })

  it("renders capacity and allocatable for any resource", () => {
    render(
      <ResourceCard
        title="CPU"
        format="cpu"
        totals={{ capacity: 8, allocatable: 8, requested: 4 }}
      />,
    )
    expect(screen.getByText(/capacity/i)).toBeInTheDocument()
    expect(screen.getByText(/allocatable/i)).toBeInTheDocument()
  })

  it("omits the Used line when used is undefined", () => {
    render(
      <ResourceCard
        title="CPU"
        format="cpu"
        totals={{ capacity: 8, allocatable: 8, requested: 4 }}
      />,
    )
    expect(screen.queryByText(/used/i)).toBeNull()
  })

  it("renders the Used line when used is defined", () => {
    render(
      <ResourceCard
        title="CPU"
        format="cpu"
        totals={{ capacity: 8, allocatable: 8, requested: 4, used: 2 }}
      />,
    )
    expect(screen.getByText(/used/i)).toBeInTheDocument()
  })

  it("renders an em dash for divide-by-zero (allocatable=0)", () => {
    render(
      <ResourceCard
        title="CPU"
        format="cpu"
        totals={{ capacity: 0, allocatable: 0, requested: 0 }}
      />,
    )
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("clamps percentage display at 100% for over-committed resources", () => {
    render(
      <ResourceCard
        title="CPU"
        format="cpu"
        totals={{ capacity: 8, allocatable: 8, requested: 12 }}
      />,
    )
    const bars = document.querySelectorAll('[role="progressbar"]')
    const requestedBar = Array.from(bars).find(
      (b) => b.getAttribute("data-resource-bar") === "requested",
    )
    expect(requestedBar?.getAttribute("aria-valuenow")).toBe("100")
  })
})
