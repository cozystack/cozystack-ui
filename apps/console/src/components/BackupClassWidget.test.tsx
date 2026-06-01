import { describe, it, expect, vi } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { WidgetProps } from "@rjsf/utils"
import type { K8sList } from "@cozystack/k8s-client"
import { BackupClassWidget } from "./BackupClassWidget.tsx"
import { createMockK8sClient } from "../test-utils/mock-k8s-client.ts"
import { renderWithK8sProvider } from "../test-utils/render.tsx"

interface BackupClass {
  apiVersion: string
  kind: string
  metadata: { name: string }
}

function bc(name: string): BackupClass {
  return { apiVersion: "backups.cozystack.io/v1alpha1", kind: "BackupClass", metadata: { name } }
}

function list(...items: BackupClass[]): K8sList<BackupClass> {
  return {
    apiVersion: "backups.cozystack.io/v1alpha1",
    kind: "BackupClassList",
    metadata: { resourceVersion: "1" },
    items,
  }
}

type ListResult =
  | K8sList<BackupClass>
  | (() => K8sList<BackupClass> | Promise<K8sList<BackupClass>>)

function clientWith(result: ListResult) {
  return createMockK8sClient({
    lists: [
      { apiGroup: "backups.cozystack.io", apiVersion: "v1alpha1", plural: "backupclasses", result },
    ],
  })
}

const NEVER_RESOLVES = () => new Promise<K8sList<BackupClass>>(() => {})

function makeProps(overrides: Partial<WidgetProps> = {}): WidgetProps {
  const base = {
    id: "backupClassName",
    name: "backupClassName",
    label: "backupClassName",
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

describe("BackupClassWidget", () => {
  it("shows an explicit placeholder instead of the first class when required and nothing is chosen", async () => {
    renderWithK8sProvider(
      <BackupClassWidget {...makeProps({ required: true })} />,
      { client: clientWith(list(bc("s3"), bc("gcs"))) },
    )

    await screen.findByRole("option", { name: /^s3$/i })

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("")
    expect(screen.getByRole("option", { name: /select a backup class/i })).toBeInTheDocument()
    expect((screen.getByRole("option", { name: /^s3$/i }) as HTMLOptionElement).selected).toBe(
      false,
    )
  })

  it("keeps a committed value visible while the list is still loading", () => {
    renderWithK8sProvider(
      <BackupClassWidget {...makeProps({ required: true, value: "custom-bc" })} />,
      { client: clientWith(NEVER_RESOLVES) },
    )

    const select = screen.getByRole("combobox") as HTMLSelectElement
    expect(select.value).toBe("custom-bc")
    expect(screen.getByRole("option", { name: /custom-bc/i })).toBeInTheDocument()
  })

  it("emits undefined when an optional selection is cleared", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithK8sProvider(
      <BackupClassWidget {...makeProps({ required: false, value: "s3", onChange })} />,
      { client: clientWith(list(bc("s3"))) },
    )

    await screen.findByRole("option", { name: /^s3$/i })
    await user.selectOptions(screen.getByRole("combobox"), "")

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(undefined))
  })
})
