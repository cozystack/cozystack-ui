import type { WidgetProps } from "@rjsf/utils"
import { useK8sList } from "@cozystack/k8s-client"
import { APPS_GROUP, APPS_VERSION } from "@cozystack/types"
import { useTenantContext } from "../lib/tenant-context.tsx"

interface VMDisk {
  apiVersion: string
  kind: string
  metadata: {
    name: string
    namespace: string
  }
  spec: {
    storage: string
    storageClass?: string
  }
}

export function VMDiskWidget(props: WidgetProps) {
  const { value, onChange, required, disabled, readonly } = props
  const { tenantNamespace } = useTenantContext()

  const { data: diskList, isLoading } = useK8sList<VMDisk>({
    apiGroup: APPS_GROUP,
    apiVersion: APPS_VERSION,
    plural: "vmdisks",
    namespace: tenantNamespace ?? undefined,
  })

  const disks = diskList?.items || []
  const currentValue = typeof value === "string" ? value : ""
  const hasCurrentInList = disks.some((d) => d.metadata.name === currentValue)

  const placeholder = isLoading
    ? "Loading..."
    : disks.length === 0
      ? "No disks available"
      : required
        ? "Select a disk..."
        : "-- None --"

  return (
    <select
      value={currentValue}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled || readonly}
      required={required}
      className="w-full rounded-lg border border-slate-300 bg-white pl-3 pr-8 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Always render an explicit placeholder so a value-less required select
          shows it instead of silently displaying the first disk. Disabled when
          required so the empty state can be displayed but never picked. */}
      <option value="" disabled={required}>
        {placeholder}
      </option>
      {/* Keep the committed value visible even before the list loads it, so an
          async re-render of useK8sList never drops the parent's selection. */}
      {currentValue && !hasCurrentInList && (
        <option value={currentValue}>{currentValue}</option>
      )}
      {disks.map((disk) => (
        <option key={disk.metadata.name} value={disk.metadata.name}>
          {`${disk.metadata.name} (${disk.spec.storage})`}
        </option>
      ))}
    </select>
  )
}
