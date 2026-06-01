import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import type { WidgetProps } from "@rjsf/utils"
import type { K8sList } from "@cozystack/k8s-client"
import { StorageClassWidget } from "./StorageClassWidget.tsx"
import { createMockK8sClient } from "../test-utils/mock-k8s-client.ts"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

const DEFAULT_ANNOTATION = "storageclass.kubernetes.io/is-default-class"

interface StorageClass {
  apiVersion: string
  kind: string
  metadata: { name: string; annotations?: Record<string, string> }
  provisioner: string
}

function sc(name: string, isDefault = false): StorageClass {
  return {
    apiVersion: "storage.k8s.io/v1",
    kind: "StorageClass",
    metadata: {
      name,
      annotations: isDefault ? { [DEFAULT_ANNOTATION]: "true" } : undefined,
    },
    provisioner: "example.com/provisioner",
  }
}

function list(...items: StorageClass[]): K8sList<StorageClass> {
  return {
    apiVersion: "storage.k8s.io/v1",
    kind: "StorageClassList",
    metadata: { resourceVersion: "1" },
    items,
  }
}

type ListResult =
  | K8sList<StorageClass>
  | (() => K8sList<StorageClass> | Promise<K8sList<StorageClass>>)

function clientWith(result: ListResult) {
  return createMockK8sClient({
    lists: [{ apiGroup: "storage.k8s.io", apiVersion: "v1", plural: "storageclasses", result }],
  })
}

const NEVER_RESOLVES = () => new Promise<K8sList<StorageClass>>(() => {})

function makeProps(overrides: Partial<WidgetProps> = {}): WidgetProps {
  const base = {
    id: "storageClass",
    name: "storageClass",
    label: "storageClass",
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

describe("StorageClassWidget", () => {
  it("shows an explicit placeholder instead of the first class when required and nothing is chosen", async () => {
    const onChange = vi.fn()
    renderWithK8sProvider(
      <StorageClassWidget {...makeProps({ required: true, onChange })} />,
      // No default-class annotation, so the auto-default effect stays idle and
      // the value-less required state is observable.
      { client: clientWith(list(sc("fast"), sc("slow"))) },
    )

    await screen.findByRole("option", { name: /^fast$/i })

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("")
    expect(screen.getByRole("option", { name: /select a storage class/i })).toBeInTheDocument()
    expect((screen.getByRole("option", { name: /^fast$/i }) as HTMLOptionElement).selected).toBe(
      false,
    )
  })

  it("keeps a committed value visible while the list is still loading", () => {
    renderWithK8sProvider(
      <StorageClassWidget {...makeProps({ required: true, value: "custom-sc" })} />,
      { client: clientWith(NEVER_RESOLVES) },
    )

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("custom-sc")
    expect(screen.getByRole("option", { name: /custom-sc/i })).toBeInTheDocument()
  })

  it("still auto-selects the cluster-default class on load when no value is set", async () => {
    const onChange = vi.fn()
    renderWithK8sProvider(
      <StorageClassWidget {...makeProps({ onChange })} />,
      { client: clientWith(list(sc("fast"), sc("standard", true))) },
    )

    await screen.findByRole("option", { name: /standard/i })

    expect(onChange).toHaveBeenCalledWith("standard")
  })
})
