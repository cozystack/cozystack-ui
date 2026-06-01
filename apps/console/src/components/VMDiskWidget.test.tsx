import { describe, it, expect, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { WidgetProps } from "@rjsf/utils"
import type { K8sList } from "@cozystack/k8s-client"
import { APPS_GROUP, APPS_VERSION } from "@cozystack/types"
import { VMDiskWidget } from "./VMDiskWidget.tsx"
import { createMockK8sClient } from "../test-utils/mock-k8s-client.ts"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

// The widget reads only `tenantNamespace`; stub the context so the test does
// not have to stand up a TenantProvider (which itself lists tenantnamespaces).
vi.mock("../lib/tenant-context.tsx", () => ({
  useTenantContext: () => ({ tenantNamespace: "tenant-test" }),
}))

interface VMDisk {
  apiVersion: string
  kind: string
  metadata: { name: string; namespace: string }
  spec: { storage: string }
}

function vmdisk(name: string, storage: string): VMDisk {
  return {
    apiVersion: `${APPS_GROUP}/${APPS_VERSION}`,
    kind: "VMDisk",
    metadata: { name, namespace: "tenant-test" },
    spec: { storage },
  }
}

const TWO_DISKS: K8sList<VMDisk> = {
  apiVersion: `${APPS_GROUP}/${APPS_VERSION}`,
  kind: "VMDiskList",
  metadata: { resourceVersion: "1" },
  items: [vmdisk("demo-disk", "5Gi"), vmdisk("other-disk", "10Gi")],
}

function makeProps(overrides: Partial<WidgetProps> = {}): WidgetProps {
  const base = {
    id: "disk-name",
    name: "name",
    label: "name",
    value: undefined as unknown,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onFocus: vi.fn(),
    required: false,
    disabled: false,
    readonly: false,
    autofocus: false,
    placeholder: "",
    options: {},
    schema: { type: "string" },
    uiSchema: {},
    formContext: {},
    rawErrors: [],
    hideError: false,
    multiple: false,
    registry: {},
  }
  return { ...base, ...overrides } as unknown as WidgetProps
}

function clientWith(result: ListOverrideResult) {
  return createMockK8sClient({
    lists: [
      {
        apiGroup: APPS_GROUP,
        apiVersion: APPS_VERSION,
        plural: "vmdisks",
        namespace: "tenant-test",
        result,
      },
    ],
  })
}

type ListOverrideResult =
  | K8sList<VMDisk>
  | (() => K8sList<VMDisk> | Promise<K8sList<VMDisk>>)

const NEVER_RESOLVES = () => new Promise<K8sList<VMDisk>>(() => {})

describe("VMDiskWidget", () => {
  it("does not auto-commit a value once the disk list loads", async () => {
    const onChange = vi.fn()
    renderWithK8sProvider(
      <VMDiskWidget {...makeProps({ required: true, onChange })} />,
      { client: clientWith(TWO_DISKS) },
    )

    // Wait until the list has loaded (disk options rendered).
    await screen.findByRole("option", { name: /demo-disk/i })

    // The widget must never push a value on its own — that asynchronous
    // commit is exactly the race that drops disks on a fast submit.
    expect(onChange).not.toHaveBeenCalled()
  })

  it("shows an explicit placeholder instead of silently displaying the first disk when required", async () => {
    renderWithK8sProvider(
      <VMDiskWidget {...makeProps({ required: true, value: undefined })} />,
      { client: clientWith(TWO_DISKS) },
    )

    await screen.findByRole("option", { name: /demo-disk/i })

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("")
    // The placeholder must exist and be selected; the first disk must not be
    // presented as the current selection.
    expect(screen.getByRole("option", { name: /select a disk/i })).toBeInTheDocument()
    expect((screen.getByRole("option", { name: /demo-disk/i }) as HTMLOptionElement).selected).toBe(
      false,
    )
  })

  it("keeps a committed value visible while the list is still loading", () => {
    renderWithK8sProvider(
      <VMDiskWidget {...makeProps({ required: true, value: "demo-disk" })} />,
      { client: clientWith(NEVER_RESOLVES) },
    )

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("demo-disk")
    expect(screen.getByRole("option", { name: /demo-disk/i })).toBeInTheDocument()
  })

  it("commits the disk name when the user picks an option", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithK8sProvider(
      <VMDiskWidget {...makeProps({ required: true, onChange })} />,
      { client: clientWith(TWO_DISKS) },
    )

    await screen.findByRole("option", { name: /other-disk/i })
    await user.selectOptions(screen.getByRole("combobox"), "other-disk")

    expect(onChange).toHaveBeenCalledWith("other-disk")
  })

  it("emits undefined when the user clears an optional selection", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithK8sProvider(
      <VMDiskWidget {...makeProps({ required: false, value: "demo-disk", onChange })} />,
      { client: clientWith(TWO_DISKS) },
    )

    await screen.findByRole("option", { name: /demo-disk/i })
    await user.selectOptions(screen.getByRole("combobox"), "")

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(undefined))
  })
})
