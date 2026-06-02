import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent, waitFor } from "@testing-library/react"
import type { WidgetProps } from "@rjsf/utils"
import type { K8sList } from "@cozystack/k8s-client"
import { DynamicOptionsWidget } from "./DynamicOptionsWidget.tsx"
import { createMockK8sClient } from "../test-utils/mock-k8s-client.ts"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

vi.mock("../lib/tenant-context.tsx", () => ({
  useTenantContext: () => ({
    tenants: [],
    selectedTenant: "root",
    selectTenant: () => {},
    tenantNamespace: "tenant-root",
    isLoading: false,
    error: null,
  }),
}))

interface OptionItem {
  value: string
  label?: string
  description?: string
  default?: boolean
}

function option(name: string, items: OptionItem[]) {
  return {
    apiVersion: "core.cozystack.io/v1alpha1",
    kind: "Option",
    metadata: { name },
    spec: { items },
  }
}

function list(...options: ReturnType<typeof option>[]): K8sList<unknown> {
  return {
    apiVersion: "core.cozystack.io/v1alpha1",
    kind: "OptionList",
    metadata: { resourceVersion: "1" },
    items: options,
  }
}

type ListResult = K8sList<unknown> | (() => K8sList<unknown> | Promise<K8sList<unknown>>)

function clientWith(result: ListResult) {
  return createMockK8sClient({
    lists: [
      {
        apiGroup: "core.cozystack.io",
        apiVersion: "v1alpha1",
        plural: "options",
        namespace: "tenant-root",
        result,
      },
    ],
  })
}

const NEVER_RESOLVES = () => new Promise<K8sList<unknown>>(() => {})

function makeProps(overrides: Partial<WidgetProps> = {}, source = "storageclass"): WidgetProps {
  const base = {
    id: "field",
    name: "field",
    label: "field",
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
    schema: { type: "string", "x-cozystack-options": { source } },
    uiSchema: {},
    formContext: {},
    rawErrors: [],
    hideError: false,
    multiple: false,
    registry: {},
  }
  return { ...base, ...overrides } as unknown as WidgetProps
}

describe("DynamicOptionsWidget", () => {
  it("auto-selects the server-marked default item exactly once when no value is set", async () => {
    const onChange = vi.fn()
    renderWithK8sProvider(
      <DynamicOptionsWidget {...makeProps({ onChange })} />,
      { client: clientWith(list(option("storageclass", [{ value: "fast" }, { value: "standard", default: true }]))) },
    )

    await waitFor(() => expect(onChange).toHaveBeenCalledWith("standard"))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it("shows an explicit placeholder instead of the first option when required and empty", async () => {
    renderWithK8sProvider(
      // No default item, so the auto-default effect stays idle and the
      // value-less required state is observable.
      <DynamicOptionsWidget {...makeProps({ required: true })} />,
      { client: clientWith(list(option("storageclass", [{ value: "fast" }, { value: "slow" }]))) },
    )

    await screen.findByRole("option", { name: /^fast$/ })
    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("")
    expect(screen.getByRole("option", { name: /select an option/i })).toBeInTheDocument()
    expect((screen.getByRole("option", { name: /^fast$/ }) as HTMLOptionElement).selected).toBe(false)
  })

  it("keeps a committed value visible while the list is still loading", () => {
    renderWithK8sProvider(
      <DynamicOptionsWidget {...makeProps({ required: true, value: "custom-x" })} />,
      { client: clientWith(NEVER_RESOLVES) },
    )

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("custom-x")
    expect(screen.getByRole("option", { name: /custom-x/ })).toBeInTheDocument()
  })

  it("emits undefined (not an empty string) when an optional field is cleared", async () => {
    const onChange = vi.fn()
    renderWithK8sProvider(
      // No default item, so clearing is not immediately re-applied.
      <DynamicOptionsWidget {...makeProps({ value: "fast", onChange })} />,
      { client: clientWith(list(option("storageclass", [{ value: "fast" }, { value: "slow" }]))) },
    )

    await screen.findByRole("option", { name: /^fast$/ })
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("renders labels and resolves items only from the Option whose name matches the source", async () => {
    renderWithK8sProvider(
      <DynamicOptionsWidget {...makeProps({}, "backupclass")} />,
      {
        client: clientWith(
          list(
            option("storageclass", [{ value: "fast", label: "Fast SSD" }]),
            option("backupclass", [{ value: "s3", label: "S3 bucket" }]),
          ),
        ),
      },
    )

    expect(await screen.findByRole("option", { name: "S3 bucket" })).toBeInTheDocument()
    // The unrelated source's items must not leak in.
    expect(screen.queryByRole("option", { name: "Fast SSD" })).not.toBeInTheDocument()
  })
})
